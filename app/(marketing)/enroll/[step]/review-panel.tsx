import Link from "next/link";
import { cohorts, tuition } from "@/lib/site";
import { ACKNOWLEDGMENT_LIST } from "@/lib/enrollment/agreement";
import { stepHref, type StepSlug } from "@/lib/validation/enrollment";
import { ButtonLink, ArrowIcon } from "@/app/components/ui/Button";
import { Callout } from "@/app/components/ui/Callout";

/**
 * Read-only review of the whole agreement before signing.
 *
 * A Server Component — nothing here is interactive, so it ships no JavaScript.
 *
 * Every section links back to its step. That matters more than it looks: this is the
 * last point at which a family can correct a misspelled child's name or a wrong
 * medication before it becomes part of a signed legal record.
 */

const ESA_LABELS: Record<string, string> = {
  intendsToApply: "Applying for Iowa ESA funding",
  payingDirectly: `Paying the $${tuition.monthlyContribution}/month contribution directly`,
  requestingHardship: "Requesting financial hardship consideration",
};

const IMMUNIZATION_LABELS: Record<string, string> = {
  recordsOnFile: "Immunization records available",
  exemptionOnFile: "Valid exemption available",
};

const MEDIA_LABELS: Record<string, string> = {
  consent: "Consents to promotional photos and video",
  noConsent: "Does NOT consent to promotional photos and video",
};

/**
 * Formats a draft date for display.
 *
 * Drafts hold raw input, so a date arrives as the "YYYY-MM-DD" string the input
 * produced. Parsed at UTC noon rather than midnight: midnight in a negative-offset
 * timezone formats back as the previous day, which is how a date of birth silently
 * shifts by one. (Also accepts a Date, for drafts created before the raw-input change
 * that are still within their TTL.)
 */
function fmtDate(value: unknown): string {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T12:00:00.000Z`)
        : null;

  if (!date || Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function str(value: unknown): string {
  return typeof value === "string" && value.trim() !== "" ? value : "—";
}

function ReviewSection({
  title,
  editHref,
  items,
}: {
  title: string;
  editHref: StepSlug;
  items: readonly { label: string; value: string }[];
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-lg font-bold text-navy-900">{title}</h2>
        <Link
          href={stepHref(editHref)}
          className="shrink-0 text-sm font-medium text-navy-700 underline hover:text-navy-900"
        >
          Change
        </Link>
      </div>
      <dl className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label} className="grid gap-0.5 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm text-ink-subtle">{item.label}</dt>
            <dd className="text-sm text-ink sm:col-span-2">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function ReviewPanel({
  data,
  warning,
}: {
  data: Record<string, unknown>;
  warning: string | null;
}) {
  const cohort = cohorts.find((c) => c.id === data.requestedCohort);
  const acceptedCount = ACKNOWLEDGMENT_LIST.filter(
    (a) => data[a.key] === true,
  ).length;

  return (
    <div className="flex flex-col gap-5">
      {warning ? <Callout title="Worth a second look">{warning}</Callout> : null}

      <ReviewSection
        title="Student"
        editHref="student"
        items={[
          { label: "Legal name", value: str(data.studentLegalName) },
          { label: "Date of birth", value: fmtDate(data.dateOfBirth) },
          { label: "Grade level", value: str(data.gradeLevel) },
          {
            label: "Requested cohort",
            value: cohort ? `${cohort.name} — ${cohort.range}` : "—",
          },
          { label: "Start date", value: fmtDate(data.enrollmentStartDate) },
        ]}
      />

      <ReviewSection
        title="Parent / guardian"
        editHref="guardian"
        items={[
          { label: "Name(s)", value: str(data.guardianName) },
          { label: "Address", value: str(data.guardianAddress) },
          { label: "Phone", value: str(data.guardianPhone) },
          { label: "Email", value: str(data.guardianEmail) },
          { label: "Emergency contact", value: str(data.emergencyContactName) },
          { label: "Emergency phone", value: str(data.emergencyContactPhone) },
        ]}
      />

      <ReviewSection
        title="Funding"
        editHref="funding"
        items={[
          {
            label: "Election",
            value:
              typeof data.esaElection === "string"
                ? (ESA_LABELS[data.esaElection] ?? "—")
                : "—",
          },
        ]}
      />

      <ReviewSection
        title="Medical & health"
        editHref="medical"
        items={[
          {
            label: "Conditions / allergies",
            value: str(data.conditionsAndAllergies),
          },
          { label: "Medications", value: str(data.medications) },
          { label: "Doctor / clinic", value: str(data.doctorName) },
          { label: "Doctor phone", value: str(data.doctorPhone) },
          {
            label: "Immunization",
            value:
              typeof data.immunizationStatus === "string"
                ? (IMMUNIZATION_LABELS[data.immunizationStatus] ?? "—")
                : "—",
          },
        ]}
      />

      <ReviewSection
        title="Acknowledgments"
        editHref="acknowledgments"
        items={[
          {
            label: "Accepted",
            value: `${acceptedCount} of ${ACKNOWLEDGMENT_LIST.length}`,
          },
        ]}
      />

      <ReviewSection
        title="Photo & media"
        editHref="media"
        items={[
          {
            label: "Release",
            value:
              typeof data.mediaRelease === "string"
                ? (MEDIA_LABELS[data.mediaRelease] ?? "—")
                : "—",
          },
        ]}
      />

      <div className="mt-2">
        <ButtonLink href={stepHref("sign")} variant="gold" size="lg">
          Everything looks right — continue to sign
          <ArrowIcon />
        </ButtonLink>
      </div>
    </div>
  );
}
