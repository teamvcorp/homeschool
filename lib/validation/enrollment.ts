import { z } from "zod";
import type { Route } from "next";
import {
  COHORT_IDS,
  ESA_ELECTIONS,
  IMMUNIZATION_STATUSES,
  MEDIA_RELEASE_CHOICES,
  ACKNOWLEDGMENT_KEYS,
} from "../db/enums";

/**
 * ENROLLMENT AGREEMENT VALIDATION — Document 9
 * =============================================================================
 * One schema per wizard step, composed into a whole-agreement schema that the final
 * submit re-validates from scratch.
 *
 * THE SERVER IS THE SOURCE OF TRUTH. Client-side validation exists only so a parent
 * does not have to round-trip to learn they mistyped an email. Every rule below runs
 * server-side on every step, and the complete set runs again at submit — because a
 * draft is untrusted data that has been sitting in a database, and because a server
 * action is reachable by direct POST with any payload at all.
 *
 * ZOD v4 NOTE: this project uses zod 4. Error customisation is `{ error: "..." }`
 * (not v3's `required_error`/`invalid_type_error`), and flattening is the top-level
 * `z.flattenError(err)` (not `err.flatten()`). Next's bundled forms guide shows v3.
 */

/* ------------------------------ shared helpers ----------------------------- */

const trimmed = z.string().trim();

/** Names, addresses, free text — bounded so an abusive POST cannot be unbounded. */
const shortText = (label: string, max = 200) =>
  trimmed.min(1, `${label} is required`).max(max, `${label} is too long`);

const optionalText = (max = 1000) =>
  trimmed
    .max(max, "This is longer than we can store — please summarise")
    .optional()
    .transform((v) => (v === "" ? undefined : v));

/**
 * Phone numbers are normalised, not rejected on format. Families write numbers in
 * a dozen shapes and none of them are wrong; what matters is that we can dial it.
 * Stored as entered (trimmed) after confirming it contains enough digits.
 */
const phone = (label: string) =>
  trimmed
    .min(1, `${label} is required`)
    .max(40)
    .refine(
      (v) => (v.match(/\d/g) ?? []).length >= 10,
      `${label} needs at least 10 digits`,
    );

const optionalPhone = trimmed
  .max(40)
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine(
    (v) => v === undefined || (v.match(/\d/g) ?? []).length >= 10,
    "Enter at least 10 digits, or leave blank",
  );

const email = trimmed
  .min(1, "Email address is required")
  .max(320)
  .email("Enter a valid email address")
  .transform((v) => v.toLowerCase());

/**
 * A calendar date from an <input type="date"> ("YYYY-MM-DD").
 *
 * Parsed as UTC noon rather than midnight. Midnight in a negative-offset timezone
 * lands on the previous day once formatted back to local time, which is how a
 * birthday silently shifts by one.
 */
const calendarDate = (label: string) =>
  trimmed
    .min(1, `${label} is required`)
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a valid date`)
    .transform((v, ctx) => {
      const date = new Date(`${v}T12:00:00.000Z`);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: "custom", message: `${label} is not a real date` });
        return z.NEVER;
      }
      return date;
    });

/* --------------------------------- Step 1 ---------------------------------- */

/** Document 9 §9.1 — Student Information. */
export const studentStepSchema = z.object({
  studentLegalName: shortText("Student's legal name", 120),
  dateOfBirth: calendarDate("Date of birth").refine(
    (date) => {
      const years =
        (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      // Generous bounds: K-12 plus the Higher Institute, with slack either side.
      // The school explicitly decouples age from grade, so this only catches
      // typos like a year of 2202 — it is not an eligibility rule.
      return years >= 3 && years <= 25;
    },
    "Please check the date of birth — that does not look like a school-age student",
  ),
  gradeLevel: shortText("Grade level", 40),
  requestedCohort: z.enum(COHORT_IDS, {
    error: "Choose the cohort that fits your student best",
  }),
  enrollmentStartDate: calendarDate("Enrollment start date"),
});

/* --------------------------------- Step 2 ---------------------------------- */

/** Document 9 §9.2 — Family / Guardian Information. */
export const guardianStepSchema = z.object({
  guardianName: shortText("Parent/guardian name", 200),
  guardianAddress: shortText("Address", 300),
  guardianPhone: phone("Primary phone"),
  guardianEmail: email,
  emergencyContactName: optionalText(200),
  emergencyContactPhone: optionalPhone,
});

/* --------------------------------- Step 3 ---------------------------------- */

/**
 * Document 9 §9.3 — Iowa ESA / School Choice.
 *
 * The PDF prints three checkboxes, but the options are mutually exclusive, so this
 * is a radio group. Rendering it as checkboxes would let a family submit a
 * contradiction we would then have to interpret.
 */
export const fundingStepSchema = z.object({
  esaElection: z.enum(ESA_ELECTIONS, {
    error: "Choose one funding option",
  }),
});

/* --------------------------------- Step 4 ---------------------------------- */

/**
 * Document 9 §9.5 — Medical & Health.
 *
 * Immunization is a required either/or: Iowa law requires documentation of
 * compliance OR a valid exemption, and admits no third state. There is deliberately
 * no "not sure" option — a family who is unsure needs the intake conversation, not
 * a database row that looks settled.
 */
export const medicalStepSchema = z.object({
  conditionsAndAllergies: optionalText(2000),
  medications: optionalText(2000),
  doctorName: optionalText(200),
  doctorPhone: optionalPhone,
  immunizationStatus: z.enum(IMMUNIZATION_STATUSES, {
    error:
      "Iowa law requires either immunization records or a valid exemption on file — choose one",
  }),
});

/* --------------------------------- Step 5 ---------------------------------- */

/**
 * Document 9 §9.4 — Program Acknowledgments.
 *
 * All eight must be affirmatively true. An HTML checkbox sends "on" when checked and
 * nothing at all when unchecked, so absence is the failure case and each key is
 * validated as a literal `true` after coercion.
 */
export const acknowledgmentsStepSchema = z.object(
  Object.fromEntries(
    ACKNOWLEDGMENT_KEYS.map((key) => [
      key,
      z.literal(true, {
        error: "Every acknowledgment must be accepted to enroll",
      }),
    ]),
  ) as Record<(typeof ACKNOWLEDGMENT_KEYS)[number], z.ZodLiteral<true>>,
);

/* --------------------------------- Step 6 ---------------------------------- */

/**
 * Document 9 §9.6 — Photo & Media Release.
 *
 * An explicit binary with NO default. The PDF offers two opposed statements rather
 * than one opt-in box, and that distinction matters: a single unchecked checkbox is
 * ambiguous between "declined" and "did not notice". Requiring an active choice
 * means a stored `noConsent` is a decision, not an omission.
 */
export const mediaStepSchema = z.object({
  mediaRelease: z.enum(MEDIA_RELEASE_CHOICES, {
    error: "Please choose whether you consent to photos and video",
  }),
});

/* --------------------------------- Step 7 ---------------------------------- */

/**
 * Document 9 §9.7 — Signature.
 *
 * `intentAffirmed` is the legally operative field. Under the E-SIGN Act and Iowa
 * UETA (Iowa Code ch. 554D) an electronic signature is valid on demonstrable intent
 * to sign plus attribution — so intent is captured as its own explicit affirmation
 * rather than inferred from the act of typing a name.
 */
export const signatureStepSchema = z.object({
  typedName: shortText("Your full legal name", 200),
  intentAffirmed: z.literal(true, {
    error: "You must confirm your intent to sign this agreement",
  }),
});

/* ------------------------------ step registry ------------------------------ */

/**
 * The wizard, in order. Drives routing (`/enroll/[step]`), the progress indicator,
 * and which schema validates a given submission — so adding a step means adding one
 * entry here rather than editing five files.
 */
export const ENROLLMENT_STEPS = [
  { slug: "student", title: "Student", schema: studentStepSchema },
  { slug: "guardian", title: "Parent / guardian", schema: guardianStepSchema },
  { slug: "funding", title: "Funding", schema: fundingStepSchema },
  { slug: "medical", title: "Medical", schema: medicalStepSchema },
  {
    slug: "acknowledgments",
    title: "Acknowledgments",
    schema: acknowledgmentsStepSchema,
  },
  { slug: "media", title: "Photo & media", schema: mediaStepSchema },
  { slug: "review", title: "Review", schema: null },
  { slug: "sign", title: "Sign", schema: signatureStepSchema },
] as const;

export type StepSlug = (typeof ENROLLMENT_STEPS)[number]["slug"];

export function getStep(slug: string) {
  return ENROLLMENT_STEPS.find((s) => s.slug === slug) ?? null;
}

export function stepIndex(slug: StepSlug): number {
  return ENROLLMENT_STEPS.findIndex((s) => s.slug === slug);
}

/**
 * Builds the href for a wizard step.
 *
 * The single place a `Route` cast is needed. `typedRoutes` types the route as
 * `/enroll/[step]` and cannot know that the segment is constrained to our slug union,
 * so interpolated values are not automatically assignable. Casting once here — with
 * the input already typed as `StepSlug` — is safer than casting at a dozen call sites,
 * because a bad slug cannot reach this function in the first place.
 */
export function stepHref(slug: StepSlug): Route {
  return `/enroll/${slug}` as Route;
}

export function nextStepSlug(slug: StepSlug): StepSlug | null {
  const i = stepIndex(slug);
  return i >= 0 && i < ENROLLMENT_STEPS.length - 1
    ? ENROLLMENT_STEPS[i + 1].slug
    : null;
}

/**
 * The complete agreement, re-validated at submit.
 *
 * Deliberately not derived by merging the step schemas at runtime: a step schema
 * could be relaxed for UX reasons and silently weaken the final gate. This states
 * the full contract explicitly, so submit enforces it whatever the steps did.
 */
export const completeAgreementSchema = studentStepSchema
  .extend(guardianStepSchema.shape)
  .extend(fundingStepSchema.shape)
  .extend(medicalStepSchema.shape)
  .extend(acknowledgmentsStepSchema.shape)
  .extend(mediaStepSchema.shape)
  .extend(signatureStepSchema.shape);

export type CompleteAgreement = z.infer<typeof completeAgreementSchema>;

/* ------------------------------ cross-checks ------------------------------- */

/**
 * Grade/age consistency, reported as a WARNING rather than an error.
 *
 * The school's whole model decouples grade from age — a nine-year-old working at a
 * sixth-grade level is a success story here, not a data-entry mistake. So this
 * surfaces on the review step and in the admin view for a human to notice, and never
 * blocks a submission.
 */
export function gradeAgeWarning(
  dateOfBirth: Date,
  gradeLevel: string,
): string | null {
  const age = Math.floor(
    (Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
  const gradeNumber = Number.parseInt(gradeLevel.replace(/\D/g, ""), 10);
  if (Number.isNaN(gradeNumber)) return null;

  // Typical age for a US grade is roughly grade + 5 or 6.
  const typicalAge = gradeNumber + 5;
  const gap = age - typicalAge;
  if (Math.abs(gap) < 3) return null;

  return gap > 0
    ? `This student is about ${gap} years older than is typical for grade ${gradeNumber}. That is fine — we place by readiness — but the Head of School will confirm cohort placement at the intake meeting.`
    : `This student is about ${Math.abs(gap)} years younger than is typical for grade ${gradeNumber}. That is fine — we place by readiness — but please double-check the date of birth and grade level.`;
}
