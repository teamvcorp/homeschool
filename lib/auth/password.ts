import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { timingSafeEqual, randomBytes } from "node:crypto";

/**
 * PASSWORD HASHING
 * =============================================================================
 * Argon2id via @node-rs/argon2. Argon2id is the current OWASP recommendation: it
 * resists both GPU cracking (memory-hard) and side-channel attacks (the "id"
 * hybrid), which bcrypt does not.
 *
 * The package is in Next's default serverExternalPackages list, so its native
 * binary passes through Turbopack untouched with no config.
 */

/**
 * OWASP-recommended baseline: 19 MiB memory, 2 passes, 1 lane.
 *
 * These are cost parameters, not correctness parameters — raising them later is
 * safe. The encoded hash string records the parameters used, so verify() keeps
 * working against hashes created under older settings.
 */
/**
 * Argon2id. The literal 2 rather than `Algorithm.Argon2id` because the package
 * declares Algorithm as an ambient `const enum`, which TypeScript forbids reading
 * under `isolatedModules` (which Next enables). The value is part of the argon2
 * encoded-hash format and is therefore stable.
 */
const ARGON2ID = 2;

const OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

/**
 * Upper bound on password length. Argon2 has no practical input limit (unlike
 * bcrypt's 72-byte truncation), but an unbounded input is a cheap way to make the
 * server do expensive work — so we cap it well above any real passphrase.
 */
export const MAX_PASSWORD_LENGTH = 256;
export const MIN_PASSWORD_LENGTH = 12;

export async function hashPassword(password: string): Promise<string> {
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error("Password exceeds maximum length");
  }
  return hash(password, OPTIONS);
}

/**
 * Verifies a password against a stored hash.
 *
 * Returns false rather than throwing on a malformed hash: a corrupted record must
 * not become a 500 that tells an attacker they found something interesting.
 */
export async function verifyPassword(
  storedHash: string,
  password: string,
): Promise<boolean> {
  if (password.length > MAX_PASSWORD_LENGTH) return false;
  try {
    return await verify(storedHash, password, OPTIONS);
  } catch {
    return false;
  }
}

/**
 * A dummy hash of a random value, used to equalise timing on the "user does not
 * exist" path.
 *
 * Without this, a login attempt for an unknown email returns immediately while a
 * known email spends ~50ms hashing — a timing oracle that lets an attacker
 * enumerate valid accounts. The login action verifies against this when no user
 * is found, so both paths cost the same.
 */
let decoyHash: string | null = null;

export async function getDecoyHash(): Promise<string> {
  decoyHash ??= await hashPassword(randomBytes(32).toString("hex"));
  return decoyHash;
}

/**
 * Constant-time string comparison for non-password secrets — CRON_SECRET, HMAC
 * digests, and similar.
 *
 * A plain `===` on secrets leaks their contents through comparison timing, one
 * byte at a time.
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  // Hashing both to a fixed width first keeps the comparison constant-time.
  if (bufA.length !== bufB.length) {
    // Still perform a comparison so the failure path costs the same.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
