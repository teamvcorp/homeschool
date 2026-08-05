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
  deleteDraftRecord,
  retainDraftForSibling,
  idempotencyKeyFor,
  siblingSeed,
  SIBLING_SEED_MAX_AGE_MS,
} from "../enrollment/draft";
import { agreementHash, CONSENT_VERSION } from "../enrollment/agreement";
import { applicationsCollection } from "../db/collections";
import { ACKNOWLEDGMENT_KEYS } from "../db/enums";
import type { EnrollmentApplicationDoc } from "../db/types";
import { checkFormFingerprint, consumeFormRateLimit } from "../anti-abuse";
import { RATE_LIMITS, consumeRateLimit, hashIdentifier } from "../auth/rate-limit";
import { getClientIp, getUserAgent } from "../audit";
import { sendEmail, queueEmail } from "../email/send";
import { getLocale } from "../i18n/server";
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
 *   free checks → attempt budget → schema validation → APPLICATION BUDGET → persist → notify
 *
 * The one non-obvious part of that order is where the tight rate limit sits. It is
 * charged AFTER validation, immediately before the write, because a limit charged
 * before validation gets spent by honest mistakes — see the warning on
 * consumeFormRateLimit in lib/anti-abuse.ts. The free fingerprint checks and a
 * generous attempt limiter still come first, so nothing expensive is unmetered.
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

/**
 * Charges the draft-creation counter.
 *
 * Shared by BOTH paths that can create a draft — the explicit "Begin enrollment" button and
 * the implicit `startDraft()` inside a step save. Charging only the explicit path left the
 * real ceiling at ENROLL_START + ENROLL_STEP per hour, because a cookieless step POST mints
 * a draft too, and drafts are the storage-exhaustion path.
 */
async function consumeDraftStartBudget(): Promise<boolean> {
  const ip = await getClientIp();
  if (!ip) {
    // Never silently skip the limiter when the IP is unknown: on a self-hosted or
    // differently-proxied deployment that would leave draft creation unbounded. Fall back
    // to one shared bucket and make the misconfiguration loud.
    console.warn(
      "[anti-abuse] no client IP on enroll-start — using a single shared bucket; check that the proxy sets x-forwarded-for",
    );
  }
  const result = await consumeRateLimit(
    `enroll-start:ip:${hashIdentifier(ip ?? "unknown-proxy-misconfigured")}`,
    RATE_LIMITS.ENROLL_START_PER_IP.limit,
    RATE_LIMITS.ENROLL_START_PER_IP.windowSeconds,
  );
  return result.allowed;
}

/* ------------------------------ start / restart ----------------------------- */

/**
 * Begins a new agreement and redirects to the first step.
 *
 * `sibling` reuses guardian, address, and medical-provider details, because Document 9
 * requires one agreement per student and a family of three should not retype the same
 * address three times. Student-specific and consent fields are never carried across — each
 * child needs their own medical history, and each agreement needs its own freely-given
 * signature, media-release decision, and funding election.
 *
 * ⚠️  THIS READS THE *SUBMITTED* DRAFT ON PURPOSE — via loadDraft(), not loadActiveDraft().
 *
 * That is the whole reason submit retains a stripped draft instead of deleting it. The
 * original implementation deleted the record and cleared the cookie on submit, so by the
 * time the family clicked "enroll another child" there was nothing to copy from and this
 * silently seeded an empty object. Sibling pre-fill appeared to be implemented and never
 * once worked. That is Bug 2.
 */
export async function startEnrollmentAction(sibling = false): Promise<void> {
  /**
   * Rate limit only — no honeypot, no timing check.
   *
   * Starting an agreement carries no user input, so there is nothing for a honeypot to
   * catch and nothing for a fill-time floor to measure; applying either here would only
   * create a way to reject a family on their very first click. But this action DOES write
   * a database record, so without any limit a bot could create unbounded drafts.
   */
  if (!(await consumeDraftStartBudget())) {
    console.warn("[anti-abuse] enroll-start rate limit hit");
    /**
     * MUST NOT be a silent redirect to the page they are already on.
     *
     * This action returns void and both call sites are a plain <form action={…}> with no
     * useActionState, so there is no channel to return a message through. Redirecting to
     * "/enroll" from "/enroll" made the button look simply dead, and every further click
     * burned another slot, so it could never recover. Redirecting the SIBLING case to
     * "/enroll" additionally discarded the carry-over the family had just asked for.
     *
     * So: send them back to the page they clicked from, with a flag that renders an
     * explanation plus the school's phone number and leaves the button there to retry.
     */
    redirect(
      sibling ? ("/enroll/submitted?busy=1" as Route) : ("/enroll?busy=1" as Route),
    );
  }

  let seed: Record<string, unknown> = {};

  const previous = await loadDraft();

  if (previous) {
    /**
     * Seed only from a genuinely just-submitted agreement.
     *
     * The freshness window closes the shared-computer case: without it, the retained
     * cookie let the NEXT person on a library or school-office machine pre-fill the
     * previous family's address, phone, emergency contact and doctor into their own form.
     * Sibling enrollment happens in one sitting, so nothing legitimate is lost.
     */
    if (sibling && previous.submittedAt) {
      const age = Date.now() - previous.submittedAt.getTime();
      if (age <= SIBLING_SEED_MAX_AGE_MS) {
        // siblingSeed is idempotent: the retained draft has already been narrowed to
        // these fields, so re-filtering is a no-op rather than a second, lossier pass.
        seed = siblingSeed(previous.data);
      } else {
        console.warn("[enroll] sibling seed skipped — retained draft is past its window");
      }
    }

    /**
     * The old draft is consumed. Delete it now rather than leaving it to a TTL.
     *
     * The cookie is about to be overwritten by startDraft(), so the record is unreachable
     * either way — but "unreachable" is not "gone", and this record holds the guardian's
     * name, address, phone, email, emergency contact and doctor. There is no purpose in
     * keeping a second copy once the application record holds all of it.
     */
    await deleteDraftRecord(previous.draftId);
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
     * 1. Free checks first — no database work.
     *
     * NOTE `enforceMinFillTime` is deliberately absent (defaults to false). A step save
     * must never be rejected for being "too fast": a family using browser autofill can
     * legitimately complete the guardian step in under two seconds, and rejecting them
     * loses an enrollment. The floor is enforced on the final submit instead.
     *
     * THIS IS WHERE BUG 1 FIRED. The honeypot was a text input named "company_website"
     * with a matching label, and Chrome and Edge address-autofill filled it on the
     * guardian step — the one step with a full address block. Both halves of the fix
     * matter: the field is now a checkbox (autofill does not tick checkboxes) and the
     * fill-time floor no longer applies here. See lib/forms/fields.ts.
     */
    const fingerprint = checkFormFingerprint(formData, "enroll-step");
    if (!fingerprint.ok) {
      return failure(fingerprint.message ?? "Submission rejected.");
    }

    // 2. Generous per-IP limit on step saves. Charged before the draft lookup, because a
    //    step POST is the cheap request an attacker would loop on.
    const stepBudget = await consumeFormRateLimit("enroll-step", {
      ipPolicy: RATE_LIMITS.ENROLL_STEP_PER_IP,
    });
    if (!stepBudget.ok) return failure(stepBudget.message ?? "Submission rejected.");

    /**
     * 3. Ensure there is an ACTIVE draft to write into.
     *
     * Checking the cookie alone is not enough: after a submit the cookie still points at
     * the stripped, submitted carry-over record, and writing student data back into that
     * would resurrect a signed agreement as an editable draft. loadActiveDraft() returns
     * null for a submitted draft, so this starts a clean one instead.
     *
     * This path CREATES a draft, so it charges the same budget the "Begin enrollment"
     * button does — otherwise the effective draft-creation ceiling is the sum of both
     * limits. A real family passes through here at most once per agreement, so the cap is
     * unreachable for them.
     */
    if (!(await loadActiveDraft())) {
      if (!(await consumeDraftStartBudget())) {
        console.warn("[anti-abuse] enroll-start rate limit hit (implicit, step save)");
        return failure(
          "We have received several submissions from your connection recently. Please wait a little while, or call the school and we will help directly.",
        );
      }
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

    /**
     * 1. Free checks. Ordered before the draft lookup so a scripted POST with no valid
     *    token costs one HMAC and nothing else.
     *
     * `enforceMinFillTime` IS enabled here, and ONLY here. That floor is safe at this
     * point and unsafe on a step save: reaching this action requires passing through the
     * review page and typing a full legal name, so a sub-two-second submission genuinely
     * is a script.
     */
    const fingerprint = checkFormFingerprint(formData, "enroll-submit", {
      enforceMinFillTime: true,
    });
    if (!fingerprint.ok) {
      return failure(fingerprint.message ?? "Submission rejected.");
    }

    /**
     * 2. Generous ATTEMPT budget, charged before validation.
     *
     * Bounds the cost of looping requests at this action (a draft lookup plus a
     * whole-agreement parse) without ever being the thing that rejects a real family:
     * 30/hr is many times more attempts than any family makes, including one enrolling
     * several children and fumbling checkboxes on each.
     */
    const attemptBudget = await consumeFormRateLimit("enroll-submit-attempt", {
      ipPolicy: RATE_LIMITS.ENROLL_SUBMIT_ATTEMPT_PER_IP,
    });
    if (!attemptBudget.ok) {
      return failure(attemptBudget.message ?? "Submission rejected.");
    }

    const draft = await loadDraft();
    if (!draft) {
      return failure(
        "We could not find your saved progress. Please start again, or call the school and we will take your details directly.",
      );
    }

    /**
     * 3. Already submitted — almost certainly the back button, or a second click.
     *
     * Handled here rather than falling through: the retained draft has been stripped to
     * just the carry-over fields, so the whole-agreement re-validation below would fail
     * with a confusing "some required information is missing" on an agreement the family
     * actually completed. Send them to the confirmation they have already earned.
     */
    if (draft.submittedAt) redirect("/enroll/submitted");

    /**
     * 4. Re-validate EVERYTHING, not just the signature step. The draft has been sitting
     *    in a database across many requests, and per-step schemas could have been relaxed
     *    for UX reasons. This is the gate that actually decides what gets stored.
     */
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

    /**
     * 5. NOW charge the tight budget — a complete, valid agreement is in hand.
     *
     * ⚠️  DO NOT MOVE THIS ABOVE THE safeParse. It used to sit before validation, which
     * meant every rejected POST spent a slot out of a 6-per-hour budget. A family
     * enrolling four children who twice forgot the intent checkbox would be locked out on
     * a genuine, fully-typed agreement and told to phone the school mid-signature — a
     * false rejection, which is the failure this whole subsystem is meant to avoid.
     * Charging only for complete applications makes a mistake free and makes the cap count
     * the thing it is named for.
     *
     * The per-email policy is passed EXPLICITLY. Applying a single policy to both keys is
     * how ENROLL_SUBMIT_PER_EMAIL became dead config while the docs claimed it was
     * enforced. `a.guardianEmail` is used rather than the raw draft value because the
     * schema has already trimmed and lowercased it, so one family cannot get two buckets
     * by capitalising differently.
     */
    const submitBudget = await consumeFormRateLimit("enroll-submit", {
      ipPolicy: RATE_LIMITS.ENROLL_SUBMIT_PER_IP,
      identifier: a.guardianEmail,
      identifierPolicy: RATE_LIMITS.ENROLL_SUBMIT_PER_EMAIL,
    });
    if (!submitBudget.ok) {
      return failure(submitBudget.message ?? "Submission rejected.");
    }

    const now = new Date();
    const ip = await getClientIp();
    const userAgent = await getUserAgent();
    /**
     * The language the family used. Persisted for two distinct purposes:
     *   - `preferredLanguage`, so every later status email reaches them in it;
     *   - `guardianSignature.displayLanguage`, as part of the signature evidence.
     * Read from the cookie and narrowed to a supported locale by getLocale().
     */
    const locale = await getLocale();

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
        /**
         * ⚠️  ALWAYS THE ENGLISH TEXT. agreementHash() hashes the English agreement
         * regardless of the language on screen, because the English text IS the
         * agreement — a translation is displayed beneath it so the family understands
         * what they are signing, never as the instrument itself. Routing a translation
         * in here would silently change what every signature attests to; that is what
         * scripts/check-agreement-hash.ts exists to catch.
         */
        agreementHash: agreementHash(),
        consentVersion: CONSENT_VERSION,
        /**
         * ...and the language they were READING. Paired with the hash, the school can
         * show both the exact terms and the language in which they were presented, which
         * is stronger evidence than the hash alone.
         */
        displayLanguage: locale,
      },
      headOfSchoolSignature: null,

      submittedAt: now,
      submissionIp: ip,
      submissionUserAgent: userAgent,
      idempotencyKey: idempotencyKeyFor(draftId),
      promotedStudentId: null,
      emailStatus: "queued",
      /** Status notifications are sent in this language. */
      preferredLanguage: locale,
      familyNotifiedStatuses: [],
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

    /**
     * --- Notify. Deliberately AFTER the write, and never allowed to fail the submission:
     * a family must not lose a completed agreement because an email provider had a bad
     * minute. Failures are queued and surfaced to an admin.
     */
    const confirmation = enrollmentConfirmationEmail({
      guardianName: a.guardianName,
      studentName: a.studentLegalName,
      locale,
    });
    const notification = newApplicationNotificationEmail({
      studentName: a.studentLegalName,
      guardianName: a.guardianName,
      guardianEmail: a.guardianEmail,
      guardianPhone: a.guardianPhone,
      applicationId,
    });

    const familyEmail = {
      to: a.guardianEmail,
      ...confirmation,
      template: "enrollmentConfirmation",
      /**
       * The LOCALE MUST BE STORED. /api/email/retry re-renders a queued message from
       * `template` + `data`, with no request and no cookie in scope, so omitting it makes
       * every retried confirmation silently revert to English.
       */
      data: {
        guardianName: a.guardianName,
        studentName: a.studentLegalName,
        locale,
      },
      relatedId: null,
    };
    const schoolEmail = {
      to: env.SCHOOL_NOTIFICATION_EMAIL,
      ...notification,
      template: "newApplicationNotification",
      data: { applicationId },
      replyTo: a.guardianEmail,
      relatedId: null,
    };

    /**
     * GLOBAL EMAIL CIRCUIT BREAKER.
     *
     * The confirmation goes to an address the SUBMITTER TYPED, so this form is a relay a
     * stranger can aim at a stranger, sent from the school's own verified domain. The
     * damage from abuse is not compute — it is the sending reputation of fyht4.com, which
     * also carries parent-portal and password-reset mail. If that domain gets throttled or
     * suspended over complaints, every family loses password resets, not just this form.
     *
     * ⚠️  IT IS CHECKED HERE, AFTER THE INSERT, AND IT CAN NEVER REJECT A FAMILY. On trip
     * the agreement is already stored; the two messages are parked in the retry queue for
     * the cron drainer instead of being sent now, and the log line is the alert. Degrade
     * email, never the save. Do not move this check above the insert, and do not turn it
     * into a `failure()` return.
     */
    const emailBudget = await consumeRateLimit(
      "enroll-submit:email-global",
      RATE_LIMITS.ENROLLMENT_EMAIL_GLOBAL_PER_DAY.limit,
      RATE_LIMITS.ENROLLMENT_EMAIL_GLOBAL_PER_DAY.windowSeconds,
    );

    if (!emailBudget.allowed) {
      console.error(
        `[anti-abuse] ENROLLMENT EMAIL BREAKER TRIPPED — daily cap of ${RATE_LIMITS.ENROLLMENT_EMAIL_GLOBAL_PER_DAY.limit} reached. Application ${applicationId} is SAVED; its emails are queued, not sent. Investigate for abuse before raising the cap.`,
      );
      await Promise.all([
        queueEmail(familyEmail, "enrollment email breaker tripped", 60 * 60 * 1000),
        queueEmail(schoolEmail, "enrollment email breaker tripped", 60 * 60 * 1000),
      ]);
      await applications.updateOne(
        { idempotencyKey: application.idempotencyKey },
        { $set: { emailStatus: "failed", updatedAt: new Date() } },
      );
    } else {
      const [familyResult, schoolResult] = await Promise.all([
        sendEmail(familyEmail),
        sendEmail(schoolEmail),
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
    }

    await retainDraftForSibling();
    redirect("/enroll/submitted");
  });
}
