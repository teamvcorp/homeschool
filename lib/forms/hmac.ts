import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env, untrimmedFormHmacSecret } from "../env";

/**
 * FORM SIGNING — one implementation, two consumers
 * =============================================================================
 * Both the enrollment draft cookie (lib/enrollment/draft.ts) and the form-issue
 * timestamp (lib/anti-abuse.ts) are HMACs over a short string with FORM_HMAC_SECRET.
 * They were separate copies of the same fifteen lines, which meant a fix to one
 * (constant-time comparison, key rotation) had to be remembered for the other.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY VERIFICATION ACCEPTS MORE THAN ONE KEY
 *
 * Signing always uses the current secret. Verification tries a small ordered list.
 * This exists because of two real failure modes, both of which present to a family
 * as the generic "we could not process that submission" — i.e. as Bug 1:
 *
 *  1. WHITESPACE. A secret pasted into a hosting dashboard often arrives with a
 *     trailing newline. env.ts now `.trim()`s it, which is correct going forward —
 *     but the trim itself CHANGES the effective key at deploy time. Without the
 *     untrimmed value in the verification list, every form already served and every
 *     draft cookie already issued would break the moment the fix deployed. Verifying
 *     against both makes the trim a non-event.
 *
 *  2. ROTATION. Rotating FORM_HMAC_SECRET otherwise invalidates every in-flight form
 *     AND every draft cookie at once — a family halfway through a fifteen-minute
 *     legal agreement is dumped back to the start with no explanation. Set
 *     FORM_HMAC_SECRET_PREVIOUS to the old value for one 12-hour window (longer than
 *     MAX_FORM_AGE_MS) and rotation costs nobody anything. Remove it afterwards.
 *
 * SECURITY NOTE: accepting an extra key widens forgery surface only to holders of
 * that key — i.e. to whoever already had the old secret. It does not weaken the
 * scheme against anyone else. The loop below does constant work regardless of which
 * key matched, so it does not leak which one it was.
 */

function hmac(key: string, payload: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Signs with the CURRENT secret only. Never signs with a legacy key. */
export function signWithFormSecret(payload: string): string {
  return hmac(env.FORM_HMAC_SECRET, payload);
}

/**
 * Keys accepted at verification time, most-current first.
 *
 * Deduplicated so the common case (no whitespace, no rotation in progress) is a
 * single HMAC.
 */
function verificationKeys(): string[] {
  const keys = [env.FORM_HMAC_SECRET];

  const untrimmed = untrimmedFormHmacSecret();
  if (untrimmed && untrimmed !== env.FORM_HMAC_SECRET) keys.push(untrimmed);

  const previous = env.FORM_HMAC_SECRET_PREVIOUS;
  if (previous && !keys.includes(previous)) keys.push(previous);

  return keys;
}

/**
 * Constant-time verification against every accepted key.
 *
 * Deliberately no early return: `matched ||= …` inside the loop keeps the work (and
 * therefore the timing) identical whether the first key matched, the last one did, or
 * none did. A plain `===` or an early `return true` leaks information about the
 * signature one byte / one key at a time through response timing.
 */
export function verifyWithFormSecret(payload: string, provided: string): boolean {
  const providedBytes = Buffer.from(provided);
  let matched = false;

  for (const key of verificationKeys()) {
    const expected = Buffer.from(hmac(key, payload));
    // timingSafeEqual throws on a length mismatch, so length is checked first. The
    // length of a base64url SHA-256 is fixed and public, so this leaks nothing.
    if (
      providedBytes.length === expected.length &&
      timingSafeEqual(providedBytes, expected)
    ) {
      matched = true;
    }
  }

  return matched;
}

/**
 * Splits a `<payload>.<signature>` token.
 *
 * `lastIndexOf` rather than `split(".")` because a payload is allowed to contain dots.
 * Returns null for anything that is not in that shape at all.
 */
export function splitSignedToken(
  value: unknown,
): { payload: string; signature: string } | null {
  if (typeof value !== "string") return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0 || separator === value.length - 1) return null;
  return {
    payload: value.slice(0, separator),
    signature: value.slice(separator + 1),
  };
}
