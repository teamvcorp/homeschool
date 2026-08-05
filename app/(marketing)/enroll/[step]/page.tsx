import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import {
  ENROLLMENT_STEPS,
  getStep,
  stepIndex,
  gradeAgeWarning,
  type StepSlug,
} from "@/lib/validation/enrollment";
import { loadActiveDraft } from "@/lib/enrollment/draft";
import { ACKNOWLEDGMENT_LIST } from "@/lib/enrollment/agreement";
import { issueFormTimestamp } from "@/lib/anti-abuse";
import { saveEnrollmentStep } from "@/lib/actions/enrollment";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Section } from "@/app/components/ui/Section";
import { StepIndicator } from "@/app/components/forms/StepIndicator";
import StepForm from "./step-form";
import ReviewPanel from "./review-panel";
import SignPanel from "./sign-panel";

export const metadata: Metadata = {
  title: "Enrollment",
  // Wizard steps must never be indexed — they are transient, personal, and useless
  // as landing pages.
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return ENROLLMENT_STEPS.map((s) => ({ step: s.slug }));
}

/**
 * One step of the enrollment wizard.
 *
 * Reads the draft (server-side, from the signed httpOnly cookie), renders the matching
 * form pre-filled, and hands the bound server action to the client form.
 *
 * `params` is a Promise in Next 16 and must be awaited. `PageProps<'/enroll/[step]'>`
 * is a global type — no import.
 */
export default async function EnrollStepPage({
  params,
}: PageProps<"/enroll/[step]">) {
  const { step: slug } = await params;
  const step = getStep(slug);
  if (!step) notFound();

  const draft = await loadActiveDraft();

  // No ACTIVE draft. Either the visitor deep-linked into the middle of the wizard, their
  // cookie expired, or they already submitted this agreement (a submitted draft is retained
  // only so the sibling flow can copy the contact details — it must never be resumed).
  // Send them to the start rather than showing a form that silently cannot save.
  if (!draft) redirect("/enroll");

  const data = draft.data as Record<string, unknown>;

  /**
   * Drafts store raw input, so text and date fields are already the strings an
   * <input> wants (dates as "YYYY-MM-DD"). Booleans come from checkboxes and are
   * rendered back as "true"/"false" for `defaultChecked` comparison.
   *
   * The `instanceof Date` branch is retained for robustness: drafts created before the
   * raw-input change stored Date objects, and one of those still inside its 14-day TTL
   * would otherwise render an empty date field.
   */
  const defaults: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      defaults[key] = value;
    } else if (typeof value === "boolean") {
      defaults[key] = value ? "true" : "false";
    } else if (value instanceof Date) {
      defaults[key] = value.toISOString().slice(0, 10);
    }
  }

  const index = stepIndex(slug as StepSlug);
  const previous: Route | null =
    index > 0 ? (`/enroll/${ENROLLMENT_STEPS[index - 1].slug}` as Route) : null;

  // Minted server-side because it is HMAC-signed; the client only echoes it back.
  const timestamp = issueFormTimestamp();

  /**
   * Grade/age consistency note. Drafts hold the date as a "YYYY-MM-DD" string, so it is
   * parsed here (UTC noon, to avoid a timezone off-by-one-day). Advisory only — the
   * school places by readiness, so this never blocks anything.
   */
  const dob =
    typeof data.dateOfBirth === "string"
      ? new Date(`${data.dateOfBirth}T12:00:00.000Z`)
      : data.dateOfBirth instanceof Date
        ? data.dateOfBirth
        : null;

  const warning =
    dob && !Number.isNaN(dob.getTime()) && typeof data.gradeLevel === "string"
      ? gradeAgeWarning(dob, data.gradeLevel)
      : null;

  return (
    <>
      <PageHeader
        eyebrow="Family enrollment agreement"
        title={step.title}
        lead={
          slug === "review"
            ? "Check everything over before you sign. You can still go back and change anything."
            : slug === "sign"
              ? "One last step."
              : undefined
        }
      />

      <Section width="narrow">
        <div className="flex flex-col gap-8">
          <StepIndicator current={slug as StepSlug} />

          {slug === "review" ? (
            <ReviewPanel data={data} warning={warning} />
          ) : slug === "sign" ? (
            <SignPanel timestamp={timestamp} />
          ) : (
            <StepForm
              slug={slug as StepSlug}
              // .bind supplies the leading argument, giving the
              // (prevState, formData) shape useActionState expects.
              action={saveEnrollmentStep.bind(null, slug as StepSlug)}
              defaults={defaults}
              timestamp={timestamp}
              acknowledgments={[...ACKNOWLEDGMENT_LIST]}
              previousHref={previous}
            />
          )}
        </div>
      </Section>
    </>
  );
}
