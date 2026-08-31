import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { authTokensCollection } from "../db/collections";
import type { AuthTokenDoc, AuthTokenSubject } from "../db/types";
import type { TokenPurpose } from "../db/enums";

/**
 * EMAILED CAPABILITY TOKENS
 * =============================================================================
 * One mechanism behind three features: "forgot my password", the account-setup link a
 * guardian gets when their application is accepted, and the link back into an unfinished
 * enrollment. All three are the same shape — a secret arrives by email, is presented
 * once, and grants exactly one narrow thing.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TOKEN IS NEVER STORED
 *
 * Only sha256 of it is. `createToken` returns the raw value to its caller, which puts it
 * in a link; after that it exists solely in the family's inbox. A leaked backup, an
 * over-broad Atlas role, or a shell on the database yields a table of hashes and no way
 * into anyone's account.
 *
 * This is the same rule as UserDoc.passwordHash, and the reason a plain HMAC (which
 * lib/forms/hmac.ts already offers, and which needs no collection) is NOT used here: a
 * stateless token cannot be marked used or revoked, and FORM_HMAC_SECRET is explicitly
 * the low-value secret that must never be able to mint a session.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY SHA-256 AND NOT ARGON2
 *
 * Argon2id is for PASSWORDS, which are short, human-chosen, and guessable. These tokens
 * are 32 bytes from a CSPRNG — roughly 256 bits of entropy. There is nothing to brute
 * force, so the stretching that makes Argon2 valuable would only make every redemption
 * slower. Plain sha256 is the correct choice for a high-entropy secret, and it keeps
 * lookup a single indexed equality match.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT MAKES A TOKEN INVALID
 *
 * Missing, expired, already used, or minted for a different purpose. All four are
 * reported to the caller as the SAME opaque failure — see `TokenFailure`. Distinguishing
 * "expired" from "never existed" tells someone probing links which of their guesses were
 * once real, and there is nothing a legitimate user does differently in the two cases.
 */

/** 32 bytes ≈ 256 bits. base64url so it survives a URL without escaping. */
const TOKEN_BYTES = 32;

/* --------------------------------- Lifetimes ------------------------------- */

/**
 * Deliberately different, because these tokens arrive under different circumstances.
 *
 * A RESET was just asked for — the person is at their keyboard, and a short window
 * limits how long a forwarded or intercepted mail stays dangerous.
 *
 * A SETUP link arrives unprompted when an administrator accepts an application. A family
 * may not open mail that day, and expiring before they look would strand them with an
 * account they cannot reach. Seven days, with the reset flow as the recovery path if it
 * lapses anyway.
 *
 * RESUME is not chosen here at all — it is bounded by the draft it points at. See
 * lib/enrollment (Phase 3); a link that outlives its draft is a link to nothing.
 */
export const TOKEN_TTL_MS = {
  reset: 60 * 60 * 1000, // 1 hour
  setup: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

/** Hex sha256. Exported for tests and for the retry drainer's sanity checks. */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/* ---------------------------------- Minting -------------------------------- */

/**
 * Mints a token for `subject` and returns the RAW value — the only time it exists in
 * this process. Store nothing; put it straight into a link.
 *
 * Any outstanding token for the same subject and purpose is marked used first. That
 * makes "send me another one" a revocation as well as a reissue: the earlier mail, which
 * may be sitting in a forwarded thread or a shared inbox, stops working immediately.
 */
export async function createToken(
  subject: AuthTokenSubject,
  ttlMs: number,
  requestedIp?: string,
): Promise<string> {
  const tokens = await authTokensCollection();
  const now = new Date();

  await supersede(subject, now);

  const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");

  const doc = {
    ...subject,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(now.getTime() + ttlMs),
    usedAt: null,
    requestedIp,
    createdAt: now,
    updatedAt: now,
  } as AuthTokenDoc;

  await tokens.insertOne(doc);

  return rawToken;
}

/** Invalidates a subject's live tokens of the same purpose. See createToken. */
async function supersede(subject: AuthTokenSubject, now: Date): Promise<void> {
  const tokens = await authTokensCollection();
  const target =
    subject.purpose === "resume"
      ? { draftId: subject.draftId, purpose: subject.purpose }
      : { userId: subject.userId, purpose: subject.purpose };

  await tokens.updateMany(
    { ...target, usedAt: null },
    { $set: { usedAt: now, updatedAt: now } },
  );
}

/* -------------------------------- Redemption ------------------------------- */

/**
 * Why a redemption failed. The CALLER MUST NOT show these to a visitor separately —
 * they exist so the server can log precisely while the screen says one thing. See the
 * header note on why "expired" and "never existed" must look identical from outside.
 */
export type TokenFailure = "notFound" | "expired" | "used" | "wrongPurpose";

export type ConsumeResult =
  | { ok: true; subject: AuthTokenSubject }
  | { ok: false; reason: TokenFailure };

/**
 * Verifies a raw token and marks it used, atomically.
 *
 * THE ATOMICITY IS THE POINT. `findOneAndUpdate` with `usedAt: null` in the filter means
 * two simultaneous redemptions of the same link cannot both succeed — the second matches
 * nothing and is reported as already used. A read-then-write would let a double-clicked
 * link, or a deliberately parallelised one, redeem twice.
 *
 * `expiresAt` is compared here as well as being TTL-indexed, because Mongo's sweeper runs
 * only about once a minute and this is the boundary, not the cleanup.
 */
export async function consumeToken(
  rawToken: string,
  purpose: TokenPurpose,
): Promise<ConsumeResult> {
  // A malformed or absent token must not reach the database as a wildcard.
  if (typeof rawToken !== "string" || rawToken.length === 0) {
    return { ok: false, reason: "notFound" };
  }

  const tokens = await authTokensCollection();
  const now = new Date();

  const claimed = await tokens.findOneAndUpdate(
    { tokenHash: hashToken(rawToken), usedAt: null },
    { $set: { usedAt: now, updatedAt: now } },
    { returnDocument: "after" },
  );

  if (!claimed) {
    /**
     * Either it never existed, or it was already used. Distinguishing them would need a
     * second read, and the distinction is not one the visitor is allowed to see anyway —
     * so we report the safer of the two and spend no extra query.
     */
    return { ok: false, reason: "notFound" };
  }

  /**
   * Past this point the token has ALREADY been burned by the update above, including on
   * the rejection paths below. That is deliberate: a token presented at the wrong
   * endpoint, or after expiry, has been exposed to something and should not survive to be
   * tried again.
   */
  if (claimed.purpose !== purpose) {
    return { ok: false, reason: "wrongPurpose" };
  }

  if (claimed.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, subject: toSubject(claimed) };
}

/**
 * Reads a token WITHOUT consuming it, to decide whether to render a form.
 *
 * The reset screen needs this: arriving at the link should show a password form or an
 * "expired" message, and burning the token just to draw the page would mean the form
 * could never be submitted. Redemption still happens at submit, through `consumeToken`.
 *
 * Returns only whether it is currently usable — never the subject — so a page cannot
 * accidentally leak whose token it is before the password is actually set.
 */
export async function peekToken(
  rawToken: string,
  purpose: TokenPurpose,
): Promise<boolean> {
  if (typeof rawToken !== "string" || rawToken.length === 0) return false;

  const tokens = await authTokensCollection();
  const found = await tokens.findOne(
    { tokenHash: hashToken(rawToken) },
    { projection: { purpose: 1, expiresAt: 1, usedAt: 1 } },
  );

  if (!found || found.usedAt) return false;
  if (found.purpose !== purpose) return false;
  return found.expiresAt.getTime() > Date.now();
}

/** Narrows a stored row back to the union the compiler understands. */
function toSubject(doc: AuthTokenDoc): AuthTokenSubject {
  return doc.purpose === "resume"
    ? { purpose: "resume", draftId: doc.draftId }
    : { purpose: doc.purpose, userId: doc.userId };
}
