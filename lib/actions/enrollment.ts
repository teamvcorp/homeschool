"use server";

import { redirect } from "next/navigation";
import { MongoServerError } from "mongodb";
import type { Route } from "next";
import {
  getStep,
  stepIndex,
  nextStepSlug,
  completeAgreementSchema,
  type StepSlug,
} from "../validation/enrollment";
import {
  getDraftId,
  startDraft,
  loadDraft,
  loadActiveDraft,
  saveDraftStep,
  retainDraftForSibling,
  idempotencyKeyFor,
  siblingSeed,
} from "../enrollment/draft";
import { agreementHash, CONSENT_VERSION } from "../enrollment/agreement";
import { applicationsCollection } from "../db/collections";
import { ACKNOWLEDGMENT_KEYS } from "../db/enums";
import type { EnrollmentApplicationDoc } from "../db/types";
import { checkPublicFormAbuse } from "../anti-abuse";
import { RATE_LIMITS, consumeRateLimit, hashIdentifier } from "../auth/rate-limit";
import { getClientIp, getUserAgent } from "../audit";
import { sendEmail } from "../email/send";
import {
  enrollmentConfirmationEmail,
  newApplicationNotificationEmail,
} from "../email/templates";
import { env } from "../env";
import { type ActionState, guardAction, failure, fromZodError } from "./types";

/**
 * ENROLLMENT ACTIONS
 * =============================================================================
 * The public write path — an unauthenticated visitor putting a minor's data into the
 * system. This is the most exposed surface in the application, so the ordering below
 * is deliberate and should not be rearranged:
 *
 *   abuse checks → schema validation → normalise → persist → notify
 *
 * Cheap rejections happen before expensive work, and nothing touches the database
 * until the payload has passed a schema.
 *
 * WHAT THESE ACTIONS ARE NOT PERMITTED TO DO
 * Write to `students`, `users`, or any collection the admin area treats as trusted.
 * A public submission produces exactly one thing: a row in `enrollmentApplications`
 * with status `submitted`. Promotion into a student record is an authenticated,
 * audited admin decision. That boundary is the reason an anonymous POST cannot
 * manufacture an enrolled student.
 */

/**
 * Fields arriving from checkboxes, which need "true" → true coercion.
 *
 * Listed explicitly rather than inferred from the schema: introspecting zod internals
 * to guess which fields are boolean is fragile across versions, and being wrong here
 * would silently turn a required consent into a passing string.
 */
const BOOLEAN_FIELDS = new Set<string>([...ACKNOWLEDGMENT_KEYS, "intentAffirmed"]);

/**
 * Pulls only the keys a step's schema declares out of the FormData.
 *
 * Whitelisting by schema shape means a crafted POST carrying extra fields cannot
 * smuggle them into the draft — anything not named in the schema is dropped before
 * validation, let alone before storage. It also drops React's `$ACTION_*` bookkeeping
 * fields, which is why `Object.fromEntries(formData)` is never used here.
 */
function extractStepFields(
  shape: Record<string, unknown>,
  formData: FormData,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(shape)) {
    const value = formData.get(key);
    if (value === null) continue; // absent — let zod report it as required
    if (typeof value !== "string") continue; // a File where text belongs
    out[key] = BOOLEAN_FIELDS.has(key) ? value === "true" : value;
  }
  return out;
}

/* ------------------------------ start / restart ----------------------------- */

/**
 * Begins a new agreement and redirects to the first step.
 *
 * `sibling` reuses guardian, address, and medical-provider details, because Document 9
 * requires one agreement per student and a family of three should not retype the same
 * address three times. Student-specific and consent fields are never carried across — each
 * child needs their own medical history, and each agreement needs its own freely-given
 * signature and media-release decision.
 *
 * ⚠️  THIS READS THE *SUBMITTED* DRAFT ON PURPOSE — via loadDraft(), not loadActiveDraft().
 *
 * That is the whole reason submit retains a stripped draft instead of deleting it. The
 * original implementation called discardDraft() on submit, which deleted the record and
 * cleared the cookie, so by the time the family clicked "enroll another child" there was
 * nothing to copy from and this silently seeded an empty object. Sibling pre-fill appeared
 * to be implemented and never once worked.
 */
export async function startEnrollmentAction(sibling = false): Promise<void> {
  /**
   * Rate limit only — no honeypot, no timing check.
   *
   * Starting an agreement carries no user input, so there is nothing for a honeypot to
   * catch and nothing for a fill-time floor to measure; applying either here would only
   * create a way to reject a family on their very first click. But this action DOES write
   * a database record, so without any limit a bot could create unbounded drafts. The cap is
   * deliberately generous — a family legitimately starting several agreements for several
   * children in one sitting must never hit it.
   */
  const ip = await getClientIp();
  if (ip) {
    const limited = await consumeRateLimit(
      `enroll-start:ip:${hashIdentifier(ip)}`,
      RATE_LIMITS.ENROLL_START_PER_IP.limit,
      RATE_LIMITS.ENROLL_START_PER_IP.windowSeconds,
    );
    if (!limited.allowed) {
      console.warn("[anti-abuse] enroll-start rate limit hit");
      // Deliberately not an error page: send them somewhere useful. The enrollment page
      // itself carries the school's phone number.
      redirect("/enroll");
    }
  }

  let seed: Record<string, unknown> = {};

  if (sibling) {
    const previous = await loadDraft();
    // siblingSeed is idempotent: the retained draft has already been narrowed to these
    // fields, so re-filtering is a no-op rather than a second, lossier pass.
    if (previous) seed = siblingSeed(previous.data);
  }

  await startDraft(seed);
  redirect("/enroll/student");
}

/* --------------------------------- save step -------------------------------- */

/**
 * Validates and saves one wizard step, then advances.
 *
 * Bound to its step slug at the call site: `saveEnrollmentStep.bind(null, "student")`,
 * which gives the `(slug, prevState, formData)` signature `useActionState` expects.
 */
export async function saveEnrollmentStep(
  slug: StepSlug,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction(async () => {
    const step = getStep(slug);
    if (!step?.schema) return failure("That step does not exist.");

    /**
     * Abuse checks first — before any database work.
     *
     * NOTE `enforceMinFillTime` is deliberately absent (defaults to false). A step save
     * must never be rejected for being "too fast": a family using browser autofill can
     * legitimately complete the guardian step in under two seconds, and rejecting them
     * loses an enrollment. The floor is enforced on the final submit instead.
     */
    const abuse = await checkPublicFormAbuse(
      formData,
      RATE_LIMITS.ENROLL_STEP_PER_IP,
      "enroll-step",
    );
    if (!abuse.ok) return failure(abuse.message ?? "Submission rejected.");

    /**
     * Ensure there is an ACTIVE draft to write into.
     *
     * Checking the cookie alone is not enough: after a submit the cookie still points at
     * the stripped, submitted carry-over record, and writing student data back into that
     * would resurrect a signed agreement as an editable draft. loadActiveDraft() returns
     * null for a submitted draft, so this starts a clean one instead.
     */
    if (!(await loadActiveDraft())) {
      await startDraft();
    }

    const raw = extractStepFields(step.schema.shape, formData);
    const parsed = step.schema.safeParse(raw);
    if (!parsed.success) return fromZodError(parsed.error);

    /**
     * Store the RAW input, not `parsed.data`.
     *
     * Validation still gates progression — a step cannot advance without passing — but
     * what lands in the draft is what the family typed.
     *
     * WHY THIS MATTERS (a bug end-to-end testing caught): the date fields are
     * `z.string().transform(→ Date)`, so `parsed.data` holds Date objects. Storing
     * those meant the final submit's re-validation received a Date where the schema
     * expects a string and failed with "expected string, received Date" — after the
     * family had filled in everything. Keeping the draft in input shape makes the
     * whole-agreement re-parse at submit work on the same data the steps validated,
     * and makes re-populating the form on "Back" trivial.
     *
     * Booleans are the deliberate exception: extractStepFields has already coerced
     * checkbox "true" to real booleans, which is what both the step schema and the
     * final schema expect.
     */
    const saved = await saveDraftStep(raw, stepIndex(slug) + 1);
    if (!saved) {
      return failure(
        "We could not save your progress. Please reload the page and try again.",
      );
    }

    const next = nextStepSlug(slug);
    // redirect() throws a control-flow exception; guardAction rethrows it untouched.
    redirect(next ? (`/enroll/${next}` as Route) : "/enroll/review");
  });
}

/* ---------------------------------- submit ---------------------------------- */

/**
 * Final submission: validates the whole agreement, records the signature, stores the
 * application, and notifies.
 */
export async function submitEnrollmentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction(async () => {
    const draftId = await getDraftId();
    if (!draftId) {
      return failure(
        "Your enrollment session has expired. Please start again — it should only take a few minutes.",
      );
    }

    const draft = await loadDraft();
    if (!draft) {
      return failure(
        "We could not find your saved progress. Please start again, or call the school and we will take your details directly.",
      );
    }

    /**
     * Already submitted — almost certainly the back button, or a second click.
     *
     * Handled here rather than falling through: the retained draft has been stripped to
     * just the carry-over fields, so the whole-agreement re-validation below would fail
     * with a confusing "some required information is missing" on an agreement the family
     * actually completed. Send them to the confirmation they have already earned.
     */
    if (draft.submittedAt) redirect("/enroll/submitted");

    /**
     * The final submit is the expensive, irreversible action — it creates an application
     * and sends email — so it keeps the full check set, including the minimum fill time.
     *
     * That floor is safe HERE and unsafe on a step save: reaching this point requires
     * passing through the review page and typing a full legal name, so a sub-two-second
     * submission genuinely is a script.
     */
    const abuse = await checkPublicFormAbuse(
      formData,
      RATE_LIMITS.ENROLL_SUBMIT_PER_IP,
      "enroll-submit",
      {
        identifier:
          typeof draft.data.guardianEmail === "string"
            ? draft.data.guardianEmail
            : undefined,
        enforceMinFillTime: true,
      },
    );
    if (!abuse.ok) return failure(abuse.message ?? "Submission rejected.");

    // Re-validate EVERYTHING, not just the signature step. The draft has been sitting
    // in a database across many requests, and per-step schemas could have been relaxed
    // for UX reasons. This is the gate that actually decides what gets stored.
    const signatureFields = extractStepFields(
      { typedName: null, intentAffirmed: null },
      formData,
    );
    const parsed = completeAgreementSchema.safeParse({
      ...draft.data,
      ...signatureFields,
    });

    if (!parsed.success) {
      const state = fromZodError(parsed.error);
      return {
        ...state,
        message:
          "Some required information is missing or invalid. Please review the earlier steps and try again.",
      };
    }

    const a = parsed.data;
    const now = new Date();
    const ip = await getClientIp();
    const userAgent = await getUserAgent();

    const application: EnrollmentApplicationDoc = {
      status: "submitted",

      studentLegalName: a.studentLegalName,
      dateOfBirth: a.dateOfBirth,
      gradeLevel: a.gradeLevel,
      requestedCohort: a.requestedCohort,
      enrollmentStartDate: a.enrollmentStartDate,

      guardian: {
        name: a.guardianName,
        email: a.guardianEmail,
        phone: a.guardianPhone,
        address: a.guardianAddress,
        emergencyContactName: a.emergencyContactName,
        emergencyContactPhone: a.emergencyContactPhone,
      },

      esaElection: a.esaElection,

      acknowledgments: Object.fromEntries(
        ACKNOWLEDGMENT_KEYS.map((key) => [key, a[key] === true]),
      ) as EnrollmentApplicationDoc["acknowledgments"],

      medical: {
        conditionsAndAllergies: a.conditionsAndAllergies,
        medications: a.medications,
        doctorName: a.doctorName,
        doctorPhone: a.doctorPhone,
        immunizationStatus: a.immunizationStatus,
      },

      mediaRelease: a.mediaRelease,

      /**
       * The signature evidence envelope. E-SIGN / Iowa UETA (ch. 554D) validity rests
       * on intent plus attribution, so we store the explicit intent affirmation, the
       * identifying context, and a hash of the exact agreement text displayed — which
       * is what lets us prove later WHAT was agreed to, not merely that something was.
       */
      guardianSignature: {
        typedName: a.typedName,
        intentAffirmed: a.intentAffirmed,
        signedAt: now,
        ip,
        userAgent,
        agreementHash: agreementHash(),
        consentVersion: CONSENT_VERSION,
      },
      headOfSchoolSignature: null,

      submittedAt: now,
      submissionIp: ip,
      submissionUserAgent: userAgent,
      idempotencyKey: idempotencyKeyFor(draftId),
      promotedStudentId: null,
      emailStatus: "queued",
      createdAt: now,
      updatedAt: now,
    };

    const applications = await applicationsCollection();

    let applicationId: string;
    try {
      const result = await applications.insertOne(application);
      applicationId = result.insertedId.toString();
    } catch (error) {
      // Duplicate idempotency key: this exact draft was already submitted, almost
      // certainly a double-click or a retried request. Treat it as the success it
      // effectively is rather than showing an error or creating a second record.
      if (error instanceof MongoServerError && error.code === 11000) {
        await retainDraftForSibling();
        redirect("/enroll/submitted");
      }
      throw error;
    }

    // --- Notify. Deliberately AFTER the write, and never allowed to fail the
    // submission: a family must not lose a completed agreement because an email
    // provider had a bad minute. Failures are queued and surfaced to an admin.
    const confirmation = enrollmentConfirmationEmail({
      guardianName: a.guardianName,
      studentName: a.studentLegalName,
    });
    const notification = newApplicationNotificationEmail({
      studentName: a.studentLegalName,
      guardianName: a.guardianName,
      guardianEmail: a.guardianEmail,
      guardianPhone: a.guardianPhone,
      applicationId,
    });

    const [familyResult, schoolResult] = await Promise.all([
      sendEmail({
        to: a.guardianEmail,
        ...confirmation,
        template: "enrollmentConfirmation",
        data: { guardianName: a.guardianName, studentName: a.studentLegalName },
        relatedId: null,
      }),
      sendEmail({
        to: env.SCHOOL_NOTIFICATION_EMAIL,
        ...notification,
        template: "newApplicationNotification",
        data: { applicationId },
        replyTo: a.guardianEmail,
        relatedId: null,
      }),
    ]);

    await applications.updateOne(
      { idempotencyKey: application.idempotencyKey },
      {
        $set: {
          emailStatus: familyResult.ok && schoolResult.ok ? "sent" : "failed",
          updatedAt: new Date(),
        },
      },
    );

    await retainDraftForSibling();
    redirect("/enroll/submitted");
  });
}
