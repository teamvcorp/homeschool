import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes } from "node:crypto";
import { env, isProduction } from "../env";
import { draftsCollection } from "../db/collections";
import type { EnrollmentDraftDoc } from "../db/types";
import {
  signWithFormSecret,
  verifyWithFormSecret,
  splitSignedToken,
} from "../forms/hmac";

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
 * RETENTION, in three tiers:
 *   - Abandoned in-progress draft: TTL on `updatedAt`, 14 days.
 *   - Submitted carry-over stub:   TTL on `submittedAt`, 24 hours (see indexes.ts).
 *   - Consumed carry-over stub:    deleted immediately by startEnrollmentAction.
 */

const DRAFT_COOKIE = "va_enroll_draft";

/** Cookie lifetime for an IN-PROGRESS agreement. Matches the 14-day draft TTL. */
const DRAFT_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

/**
 * How long a submitted agreement stays available as a sibling seed — cookie lifetime
 * and freshness check both.
 *
 * WHY SO SHORT. Sibling enrollment happens in one sitting; nobody comes back three days
 * later expecting their address to still be pre-filled. Meanwhile the cookie surviving a
 * submit means that on a shared family, library, or school-office computer, the NEXT
 * visitor who clicks "Start an agreement for another child" would be shown the PREVIOUS
 * family's address, phone, emergency contact, and doctor. Two hours keeps the feature and
 * closes that cross-family disclosure to a single sitting.
 */
export const SIBLING_SEED_MAX_AGE_MS = 1000 * 60 * 60 * 2;
const SIBLING_COOKIE_MAX_AGE_SECONDS = SIBLING_SEED_MAX_AGE_MS / 1000;

/* --------------------------------- signing --------------------------------- */

/** `<id>.<signature>` — verified before the id is ever used in a query. */
function encodeCookie(draftId: string): string {
  return `${draftId}.${signWithFormSecret(draftId)}`;
}

/**
 * Decodes and verifies the cookie.
 *
 * Signing and constant-time verification live in lib/forms/hmac.ts, shared with the form
 * timestamp — including the accept-previous-key behaviour, which is what stops a secret
 * rotation (or the addition of `.trim()` in env.ts) from invalidating every family's
 * in-progress agreement at once.
 */
function decodeCookie(value: string | undefined): string | null {
  const token = splitSignedToken(value);
  if (!token) return null;
  if (!verifyWithFormSecret(token.payload, token.signature)) return null;
  return token.payload;
}

/* ---------------------------------- cookie --------------------------------- */

/** The current draft id, or null. Rejects forged or tampered cookies. */
export async function getDraftId(): Promise<string | null> {
  const store = await cookies();
  return decodeCookie(store.get(DRAFT_COOKIE)?.value);
}

async function setDraftCookie(draftId: string, maxAge: number): Promise<void> {
  const store = await cookies();
  store.set(DRAFT_COOKIE, encodeCookie(draftId), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearDraftCookie(): Promise<void> {
  const store = await cookies();
  store.delete(DRAFT_COOKIE);
}

/**
 * Issues a fresh draft id and sets the cookie.
 *
 * ONLY callable from a Server Action or Route Handler — Next throws if a cookie is
 * set during a Server Component render.
 *
 * `seed` is the sibling carry-over. Its keys are recorded separately in `seededFields`
 * so the wizard can TELL the family which values were pre-filled: a silently pre-populated
 * value on a document they are about to sign should be confirmed, not assumed, and a
 * family who lands on an empty first step with no notice concludes (as one did) that the
 * carry-over did not work.
 */
export async function startDraft(seed: Record<string, unknown> = {}): Promise<string> {
  const draftId = randomBytes(24).toString("base64url");
  await setDraftCookie(draftId, DRAFT_MAX_AGE_SECONDS);

  const drafts = await draftsCollection();
  const now = new Date();
  await drafts.insertOne({
    draftId,
    data: seed,
    seededFields: Object.keys(seed),
    completedStep: 0,
    createdAt: now,
    updatedAt: now,
  });

  return draftId;
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
 * Merges step data into the draft.
 *
 * `completedStep` only moves forward, so revisiting an earlier step to fix a typo does not
 * reset progress. Keys are whitelisted by the step schema at the call site, so the draft
 * cannot accumulate arbitrary fields from a crafted POST body.
 */
export async function saveDraftStep(
  patch: Record<string, unknown>,
  completedStep: number,
): Promise<boolean> {
  const draftId = await getDraftId();
  if (!draftId) return false;

  const drafts = await draftsCollection();
  const result = await drafts.updateOne(
    // The `submittedAt` guard belongs in the query, not just in the caller: a signed
    // agreement must not be writable even if a future call site forgets to check.
    // `submittedAt: null` is the MongoDB idiom that matches "null OR field absent",
    // which is what an in-progress draft looks like (startDraft never sets the field).
    { draftId, submittedAt: null },
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

/* -------------------------------- lifecycle -------------------------------- */

/**
 * Deletes one draft record by id. Does NOT touch the cookie.
 *
 * ⚠️  THERE IS DELIBERATELY NO `discardDraft()` HELPER ANY MORE.
 *
 * There used to be one — "delete the record and clear the cookie" — and submit called it.
 * That is exactly the bug that made "enroll another child" silently do nothing: by the time
 * the family clicked the sibling button there was nothing left to copy their contact
 * details from, so siblingSeed() received an empty object. The feature looked implemented
 * and had never once worked.
 *
 * A convenient combined helper is what made that mistake a one-liner, so the primitives are
 * now separate and the submit path uses `retainDraftForSibling` instead. If you are about to
 * re-add a discard-on-submit helper, you are re-adding Bug 2.
 */
export async function deleteDraftRecord(draftId: string): Promise<void> {
  const drafts = await draftsCollection();
  await drafts.deleteOne({ draftId });
}

/**
 * Called after a successful submit, INSTEAD of deleting the draft.
 *
 * What this does:
 *   1. STRIPS the draft down to only the sibling carry-over fields. The child's medical
 *      history, name, date of birth, acknowledgments, media-release choice and signature
 *      are all removed — the application record is the system of record for those, and a
 *      second copy in a draft is retention with no purpose.
 *   2. MARKS it submitted, so the step pages refuse to resume it and `saveDraftStep`
 *      refuses to write to it.
 *   3. SHORTENS the cookie to the sibling window (2 hours), so a shared computer does not
 *      hand the next visitor this family's contact details.
 *
 * `submittedAt` also drives a 24-hour TTL index, so an unused stub reaps itself even if the
 * family never clicks the sibling button. The normal path deletes it sooner than that —
 * startEnrollmentAction removes it the moment the seed has been read.
 *
 * Idempotent: siblingSeed over already-stripped data is a no-op, so the double-submit path
 * (unique-index collision) can call this safely in either order.
 */
export async function retainDraftForSibling(): Promise<void> {
  const draftId = await getDraftId();
  if (!draftId) return;

  const drafts = await draftsCollection();
  const existing = await drafts.findOne({ draftId });
  if (!existing) return;

  const now = new Date();
  await drafts.updateOne(
    { draftId },
    {
      $set: {
        // Only the carry-over fields survive.
        data: siblingSeed(existing.data),
        submittedAt: existing.submittedAt ?? now,
        updatedAt: now,
      },
      // The stub is no longer a form to fill in, so a "carried over" notice would be
      // meaningless on it. The next draft records its own seededFields in startDraft.
      $unset: { seededFields: "" },
    },
  );

  await setDraftCookie(draftId, SIBLING_COOKIE_MAX_AGE_SECONDS);
}

/**
 * A stable idempotency key for the application this draft becomes.
 *
 * Derived from the draft id, so a double-clicked submit or a retried request maps to
 * the same key and the unique index on `enrollmentApplications.idempotencyKey` turns
 * the second write into a no-op rather than a duplicate family record.
 *
 * NOTE: signed with the CURRENT secret only, not the rotation-tolerant verifier — this
 * value is stored and queried, so it must be reproducible, not merely verifiable. The
 * consequence to accept: rotating FORM_HMAC_SECRET while a draft is mid-flight changes that
 * draft's key, so a submit-then-retry straddling the rotation could produce two
 * applications. That is a duplicate an admin can see and merge, which is a far better
 * failure than a rotation-tolerant key that cannot be looked up.
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
 * children completes this three times. Guardian, address, and medical-provider details are
 * identical across siblings, and retyping them is exactly the friction that makes someone
 * abandon the third form.
 *
 * ⚠️  WHAT IS DELIBERATELY NOT HERE, AND WHY EACH ONE MATTERS
 *
 * Student identity, medical history, acknowledgments, media release, signature: each child
 * needs their own, and each agreement needs its own freely-given consent.
 *
 * `esaElection` — REMOVED, and it must not come back. The Iowa ESA is a PER-STUDENT
 * account, so the funding election is a per-student decision. Carried over, it arrived
 * pre-selected on the funding step and was written verbatim into the second child's
 * application: a family who elected ESA for child 1 and intended to pay directly for
 * child 2 could click straight past a pre-selected radio and end up with a signed
 * agreement recording a financial election they never made. It is also not what the
 * confirmation page promises ("your contact details and doctor's information").
 *
 * THIS LIST IS PART OF A USER-FACING PROMISE. If you add a field here, update the copy on
 * app/(marketing)/enroll/submitted/page.tsx and docs/forms-and-validation.md in the same
 * commit.
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
  ] as const;

  return Object.fromEntries(
    carry
      .filter((key) => previous[key] !== undefined)
      .map((key) => [key, previous[key]]),
  );
}
