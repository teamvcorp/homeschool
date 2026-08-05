import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env, isProduction } from "../env";
import { draftsCollection } from "../db/collections";
import type { EnrollmentDraftDoc } from "../db/types";

/**
 * ENROLLMENT DRAFT STATE
 * =============================================================================
 * The wizard is long, legally significant, and asks for a minor's medical history.
 * Where the half-finished answers live is therefore a real design decision, not an
 * implementation detail.
 *
 * WHAT WE DO: a server-side draft document keyed by an HMAC-signed, httpOnly cookie
 * carrying only an opaque id.
 *
 * WHY NOT localStorage / sessionStorage: it would put a child's medical conditions in
 * plaintext on a possibly-shared family computer, readable by any XSS.
 *
 * WHY NOT URL / searchParams state: the same data would land in browser history,
 * server access logs, and any Referer header the page emits.
 *
 * WHY NOT a hidden-field accumulator: every step would re-POST the whole record, and
 * a tampered field would be indistinguishable from a real one.
 *
 * WHY NOT an unsigned cookie id: a bare id is guessable and enumerable. Signing it
 * means a forged cookie is rejected without a database round-trip.
 *
 * The design also happens to give progressive enhancement for free: each step is an
 * ordinary form POST, so the wizard works with JavaScript disabled.
 *
 * A TTL index on `updatedAt` expires abandoned drafts after 14 days — housekeeping,
 * but mostly so a half-entered medical history does not sit in the database forever.
 */

const DRAFT_COOKIE = "va_enroll_draft";
const DRAFT_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

/* --------------------------------- signing --------------------------------- */

function sign(draftId: string): string {
  return createHmac("sha256", env.FORM_HMAC_SECRET)
    .update(draftId)
    .digest("base64url");
}

/** `<id>.<signature>` — verified before the id is ever used in a query. */
function encodeCookie(draftId: string): string {
  return `${draftId}.${sign(draftId)}`;
}

function decodeCookie(value: string | undefined): string | null {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const draftId = value.slice(0, separator);
  const provided = value.slice(separator + 1);
  const expected = sign(draftId);

  // Constant-time comparison: a plain === leaks the signature one byte at a time
  // through response timing.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  return draftId;
}

/* ---------------------------------- cookie --------------------------------- */

/** The current draft id, or null. Rejects forged or tampered cookies. */
export async function getDraftId(): Promise<string | null> {
  const store = await cookies();
  return decodeCookie(store.get(DRAFT_COOKIE)?.value);
}

/**
 * Issues a fresh draft id and sets the cookie.
 *
 * ONLY callable from a Server Action or Route Handler — Next throws if a cookie is
 * set during a Server Component render.
 */
export async function startDraft(seed: Record<string, unknown> = {}): Promise<string> {
  const draftId = randomBytes(24).toString("base64url");
  const store = await cookies();

  store.set(DRAFT_COOKIE, encodeCookie(draftId), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: DRAFT_MAX_AGE_SECONDS,
  });

  const drafts = await draftsCollection();
  const now = new Date();
  await drafts.insertOne({
    draftId,
    data: seed,
    completedStep: 0,
    createdAt: now,
    updatedAt: now,
  });

  return draftId;
}

export async function clearDraftCookie(): Promise<void> {
  const store = await cookies();
  store.delete(DRAFT_COOKIE);
}

/* ----------------------------------- data ---------------------------------- */

/**
 * The draft the cookie points at, WHETHER OR NOT it has been submitted.
 *
 * Use this only where a submitted draft is legitimately wanted — currently just the sibling
 * carry-over, which reads the contact details out of the agreement that was just submitted.
 * For anything that resumes or writes the wizard, use `loadActiveDraft`.
 */
export async function loadDraft(): Promise<EnrollmentDraftDoc | null> {
  const draftId = await getDraftId();
  if (!draftId) return null;
  const drafts = await draftsCollection();
  return drafts.findOne({ draftId });
}

/**
 * The draft the cookie points at, only if it is still in progress.
 *
 * Returns null for a submitted draft, so a family cannot land back in an agreement they
 * have already signed — and so a stray POST cannot write student data into the stripped
 * carry-over record left behind by a submit.
 */
export async function loadActiveDraft(): Promise<EnrollmentDraftDoc | null> {
  const draft = await loadDraft();
  if (!draft || draft.submittedAt) return null;
  return draft;
}

/**
 * Merges validated step data into the draft.
 *
 * Only ever called with output that has already passed a zod schema, so the draft
 * cannot accumulate arbitrary keys from a crafted POST body. `completedStep` only
 * moves forward, so revisiting an earlier step to fix a typo does not reset progress.
 */
export async function saveDraftStep(
  patch: Record<string, unknown>,
  completedStep: number,
): Promise<boolean> {
  const draftId = await getDraftId();
  if (!draftId) return false;

  const drafts = await draftsCollection();
  const result = await drafts.updateOne(
    { draftId },
    {
      $set: {
        // Dot-notation keys so a step updates only its own fields rather than
        // replacing the whole `data` object.
        ...Object.fromEntries(
          Object.entries(patch).map(([key, value]) => [`data.${key}`, value]),
        ),
        updatedAt: new Date(),
      },
      $max: { completedStep },
    },
  );

  return result.matchedCount === 1;
}

/** Deletes the draft record and clears the cookie. */
export async function discardDraft(): Promise<void> {
  const draftId = await getDraftId();
  if (draftId) {
    const drafts = await draftsCollection();
    await drafts.deleteOne({ draftId });
  }
  await clearDraftCookie();
}

/**
 * Called after a successful submit, INSTEAD of discardDraft.
 *
 * ⚠️  DO NOT replace this with discardDraft. Doing so is precisely the bug that made the
 * "enroll another child" pre-fill silently do nothing: submit deleted the draft and cleared
 * the cookie, so by the time the family clicked the sibling button there was nothing left
 * to copy their contact details from, and siblingSeed() received an empty object.
 *
 * What this does instead:
 *   1. STRIPS the draft down to only the sibling carry-over fields. The child's medical
 *      history, name, date of birth, acknowledgments, media-release choice and signature
 *      are all removed — the application record is the system of record for those, and
 *      keeping a second copy in a draft for another 14 days is retention we do not need.
 *   2. MARKS it submitted, so the step pages refuse to resume it.
 *   3. KEEPS the cookie, so the sibling flow can find it.
 *
 * Net effect: the family's contact details survive for the sibling flow, the sensitive
 * data does not, and the TTL index still reaps the remainder.
 */
export async function retainDraftForSibling(): Promise<void> {
  const draftId = await getDraftId();
  if (!draftId) return;

  const drafts = await draftsCollection();
  const existing = await drafts.findOne({ draftId });
  if (!existing) return;

  await drafts.updateOne(
    { draftId },
    {
      $set: {
        // Only the carry-over fields survive.
        data: siblingSeed(existing.data),
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );
}

/**
 * A stable idempotency key for the application this draft becomes.
 *
 * Derived from the draft id, so a double-clicked submit or a retried request maps to
 * the same key and the unique index on `enrollmentApplications.idempotencyKey` turns
 * the second write into a no-op rather than a duplicate family record.
 */
export function idempotencyKeyFor(draftId: string): string {
  return createHmac("sha256", env.FORM_HMAC_SECRET)
    .update(`application:${draftId}`)
    .digest("hex");
}

/**
 * Seed values carried into a sibling's application.
 *
 * Families enrol one student per agreement (per Document 9), so a family with three
 * children completes this three times. Guardian, address, and medical-provider
 * details are identical across siblings, and retyping them is exactly the friction
 * that makes someone abandon the third form. Student-specific and consent fields are
 * deliberately NOT carried over — each child needs their own medical history, and
 * each agreement needs its own freely-given signature and media-release decision.
 */
export function siblingSeed(
  previous: Record<string, unknown>,
): Record<string, unknown> {
  const carry = [
    "guardianName",
    "guardianAddress",
    "guardianPhone",
    "guardianEmail",
    "emergencyContactName",
    "emergencyContactPhone",
    "doctorName",
    "doctorPhone",
    "esaElection",
  ] as const;

  return Object.fromEntries(
    carry
      .filter((key) => previous[key] !== undefined)
      .map((key) => [key, previous[key]]),
  );
}
