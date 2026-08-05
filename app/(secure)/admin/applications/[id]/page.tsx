import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { can } from "@/lib/auth/roles";
import { findApplication } from "@/lib/queries/records";
import { toApplicationDetail } from "@/lib/dto";
import { logAudit } from "@/lib/audit";
import { APPLICATION_TRANSITIONS } from "@/lib/db/enums";
import { ACKNOWLEDGMENT_LIST } from "@/lib/enrollment/agreement";
import { LOCALE_LABELS } from "@/lib/i18n/locales";
import SecureHeader from "@/app/components/secure/SecureHeader";
import { ADMIN_NAV } from "@/app/components/secure/nav";
import { FactList } from "@/app/components/ui/PageHeader";
import { Callout } from "@/app/components/ui/Callout";
import {
  TransitionForm,
  CountersignForm,
  PromoteForm,
} from "./review-actions";

export const metadata: Metadata = {
  title: "Application review",
  robots: { index: false, follow: false },
};

const ESA_LABELS: Record<string, string> = {
  intendsToApply: "Applying for Iowa ESA funding",
  payingDirectly: "Paying the monthly contribution directly",
  requestingHardship: "Requesting financial hardship consideration",
};

const IMMUNIZATION_LABELS: Record<string, string> = {
  recordsOnFile: "Immunization records available",
  exemptionOnFile: "Valid exemption available",
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Full application review.
 *
 * This page READS a minor's medical record, so it writes an audit entry — the FERPA
 * question a school must be able to answer is not only who changed a record but who has
 * seen it. `application.read` is logged on every view.
 */
export default async function ApplicationDetailPage({
  params,
}: PageProps<"/admin/applications/[id]">) {
  const user = await requireUser();
  if (user.role === "parent") redirect("/portal");
  if (!can(user.role, "applications:read")) redirect("/admin");

  const { id } = await params;
  const doc = await findApplication(id);
  if (!doc) notFound();

  const a = toApplicationDetail(doc, user);

  // Audited because this view exposes medical detail.
  await logAudit({
    actor: user,
    action: "application.read",
    subjectId: doc._id,
    subjectType: "application",
  });

  const allowedTransitions = APPLICATION_TRANSITIONS[doc.status];
  const mayDecide = can(user.role, "applications:decide");
  const allAcknowledged = ACKNOWLEDGMENT_LIST.every(
    (ack) => a.acknowledgments[ack.key],
  );

  return (
    <>
      <SecureHeader user={user} nav={ADMIN_NAV} />

      <main
        id="main"
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8"
      >
        <Link
          href="/admin/applications"
          className="text-sm font-medium text-navy-700 hover:text-navy-900"
        >
          &larr; All applications
        </Link>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-serif text-3xl font-bold text-navy-900">
            {a.studentLegalName}
          </h1>
          <span className="rounded-full bg-navy-100 px-3 py-1 text-sm font-semibold text-navy-800">
            {a.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-subtle">
          Submitted {fmt(a.submittedAt)} · {a.gradeLevel}
        </p>

        {a.promoted ? (
          <div className="mt-6">
            <Callout title="Already promoted">
              A student record has been created from this application.
            </Callout>
          </div>
        ) : null}

        {a.emailStatus === "failed" ? (
          <div className="mt-6">
            <Callout title="Confirmation email did not send" variant="statute">
              The application is stored safely. The family may not know it arrived —
              consider calling them at {a.guardianPhone}. Queued emails retry
              automatically.
            </Callout>
          </div>
        ) : null}

        {/*
          A DECLINE SENDS NO EMAIL. That is a deliberate decision, not a gap: telling a
          family their child was not accepted is a phone call. But a decision made by
          software and communicated by nobody is worse than either, so this prompt stands
          on the record until someone reads it — the one place staff cannot miss it.
        */}
        {a.status === "declined" ? (
          <div className="mt-6">
            <Callout title="Please call this family" variant="statute">
              No automatic email is sent when an application is declined. This family has
              not been told. Call{" "}
              <a href={`tel:${a.guardianPhone}`} className="font-semibold underline">
                {a.guardianPhone}
              </a>{" "}
              and speak to {a.guardianName}
              {a.preferredLanguage !== "en" ? (
                <>
                  {" "}
                  &mdash; they applied in{" "}
                  <strong>{LOCALE_LABELS[a.preferredLanguage]}</strong>, so arrange an
                  interpreter if you need one
                </>
              ) : null}
              .
            </Callout>
          </div>
        ) : null}

        {/*
          What the family already knows. Prevents a staff member either duplicating a
          message or assuming the system delivered news it deliberately withheld.
        */}
        {a.familyNotifiedStatuses.length > 0 ? (
          <p className="mt-4 text-sm text-ink-subtle">
            Family emailed about:{" "}
            <span className="font-medium text-navy-800">
              {a.familyNotifiedStatuses.join(", ")}
            </span>
          </p>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* ---------------- Record ---------------- */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <section>
              <h2 className="font-serif text-lg font-bold text-navy-900">Student</h2>
              <div className="mt-3">
                <FactList
                  items={[
                    { label: "Legal name", value: a.studentLegalName },
                    { label: "Date of birth", value: fmt(a.dateOfBirth) },
                    { label: "Grade level", value: a.gradeLevel },
                    { label: "Requested cohort", value: a.requestedCohort ?? "—" },
                    { label: "Intended start", value: fmt(a.enrollmentStartDate) },
                  ]}
                />
              </div>
            </section>

            <section>
              <h2 className="font-serif text-lg font-bold text-navy-900">
                Parent / guardian
              </h2>
              <div className="mt-3">
                <FactList
                  items={[
                    { label: "Name(s)", value: a.guardianName },
                    {
                      label: "Email",
                      value: (
                        <a
                          href={`mailto:${a.guardianEmail}`}
                          className="text-navy-700 underline"
                        >
                          {a.guardianEmail}
                        </a>
                      ),
                    },
                    {
                      label: "Phone",
                      value: (
                        <a href={`tel:${a.guardianPhone}`} className="text-navy-700 underline">
                          {a.guardianPhone}
                        </a>
                      ),
                    },
                    { label: "Address", value: a.guardianAddress },
                    {
                      /**
                       * Shown to staff so whoever calls knows which language to open
                       * with. Status emails are already sent in it automatically.
                       */
                      label: "Language",
                      value:
                        a.preferredLanguage === "en" ? (
                          "English"
                        ) : (
                          <span className="font-semibold text-gold-700">
                            {LOCALE_LABELS[a.preferredLanguage]}
                          </span>
                        ),
                    },
                    { label: "Emergency contact", value: a.emergencyContactName ?? "—" },
                    { label: "Emergency phone", value: a.emergencyContactPhone ?? "—" },
                  ]}
                />
              </div>
            </section>

            <section>
              <h2 className="font-serif text-lg font-bold text-navy-900">Funding</h2>
              <div className="mt-3">
                <FactList
                  items={[
                    { label: "Election", value: ESA_LABELS[a.esaElection] ?? a.esaElection },
                  ]}
                />
              </div>
            </section>

            {/* Medical is null for roles without full record access — the DTO decides. */}
            {a.medical ? (
              <section>
                <h2 className="font-serif text-lg font-bold text-navy-900">
                  Medical &amp; health
                </h2>
                <p className="mt-1 text-xs text-ink-subtle">
                  Confidential. Your access to this record has been logged.
                </p>
                <div className="mt-3">
                  <FactList
                    items={[
                      {
                        label: "Conditions / allergies",
                        value: a.medical.conditionsAndAllergies ?? "None reported",
                      },
                      { label: "Medications", value: a.medical.medications ?? "None reported" },
                      { label: "Doctor / clinic", value: a.medical.doctorName ?? "—" },
                      { label: "Doctor phone", value: a.medical.doctorPhone ?? "—" },
                      {
                        label: "Immunization",
                        value:
                          IMMUNIZATION_LABELS[a.medical.immunizationStatus] ??
                          a.medical.immunizationStatus,
                      },
                    ]}
                  />
                </div>
              </section>
            ) : (
              <section>
                <h2 className="font-serif text-lg font-bold text-navy-900">
                  Medical &amp; health
                </h2>
                <p className="mt-2 text-sm text-ink-subtle">
                  Your role does not include access to medical detail.
                </p>
              </section>
            )}

            <section>
              <h2 className="font-serif text-lg font-bold text-navy-900">
                Acknowledgments
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {allAcknowledged
                  ? `All ${ACKNOWLEDGMENT_LIST.length} accepted.`
                  : "⚠ Not all acknowledgments were accepted — this should not be possible."}
              </p>
              <ul className="mt-3 flex list-none flex-col gap-2">
                {ACKNOWLEDGMENT_LIST.map((ack) => (
                  <li key={ack.key} className="flex items-start gap-2 text-sm">
                    <span
                      aria-hidden="true"
                      className={
                        a.acknowledgments[ack.key]
                          ? "text-crest-green-600"
                          : "text-crest-red-600"
                      }
                    >
                      {a.acknowledgments[ack.key] ? "✓" : "✗"}
                    </span>
                    <span className="text-ink-muted">
                      {ack.text}
                      <span className="sr-only">
                        {a.acknowledgments[ack.key] ? " — accepted" : " — NOT accepted"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-lg font-bold text-navy-900">
                Photo &amp; media release
              </h2>
              <p
                className={`mt-2 text-sm font-semibold ${
                  a.mediaRelease === "consent"
                    ? "text-crest-green-700"
                    : "text-crest-red-700"
                }`}
              >
                {a.mediaRelease === "consent"
                  ? "Consents to promotional photos and video"
                  : "Does NOT consent — do not use this student's image"}
              </p>
            </section>

            {/* Signature evidence — the E-SIGN / Iowa UETA record. */}
            <section>
              <h2 className="font-serif text-lg font-bold text-navy-900">
                Signature record
              </h2>
              <div className="mt-3">
                <FactList
                  items={[
                    { label: "Signed by", value: a.signature.typedName },
                    { label: "Intent affirmed", value: a.signature.intentAffirmed ? "Yes" : "No" },
                    {
                      label: "Signed at",
                      value: new Date(a.signature.signedAt).toLocaleString("en-US"),
                    },
                    { label: "IP address", value: a.signature.ip ?? "—" },
                    { label: "Consent version", value: a.signature.consentVersion },
                    {
                      /**
                       * The language on screen at signing. The fingerprint below always
                       * covers the ENGLISH text, because the English text is the
                       * agreement — a translation is shown alongside so the family
                       * understands it, never as the instrument. Recording both makes the
                       * evidence stronger: the exact terms, and how they were presented.
                       */
                      label: "Signed while reading",
                      value: LOCALE_LABELS[a.signature.displayLanguage],
                    },
                    {
                      label: "Agreement fingerprint",
                      value: (
                        <code className="break-all text-xs">
                          {a.signature.agreementHash}
                        </code>
                      ),
                    },
                    {
                      label: "Countersigned",
                      value: a.countersigned
                        ? `${a.countersigned.typedName} — ${new Date(a.countersigned.signedAt).toLocaleString("en-US")}`
                        : "Not yet countersigned",
                    },
                  ]}
                />
              </div>
            </section>
          </div>

          {/* ---------------- Decisions ---------------- */}
          <aside className="flex flex-col gap-6">
            {mayDecide ? (
              <>
                <div className="rounded-2xl border border-line bg-white p-6">
                  <h2 className="font-serif text-lg font-bold text-navy-900">
                    Advance status
                  </h2>
                  <div className="mt-4">
                    <TransitionForm
                      applicationId={a.id}
                      allowed={allowedTransitions}
                      currentNotes={a.reviewNotes}
                    />
                  </div>
                </div>

                {!a.countersigned ? (
                  <div className="rounded-2xl border border-line bg-white p-6">
                    <h2 className="font-serif text-lg font-bold text-navy-900">
                      Countersign
                    </h2>
                    <div className="mt-4">
                      <CountersignForm applicationId={a.id} />
                    </div>
                  </div>
                ) : null}

                {doc.status === "accepted" && !a.promoted ? (
                  <div className="rounded-2xl border border-line border-l-4 border-l-gold-400 bg-white p-6">
                    <h2 className="font-serif text-lg font-bold text-navy-900">
                      Promote to student record
                    </h2>
                    <div className="mt-4">
                      <PromoteForm
                        applicationId={a.id}
                        suggestedCohort={a.requestedCohort}
                        suggestedGrade={a.gradeLevel}
                      />
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-2xl border border-line bg-white p-6">
                <p className="text-sm text-ink-subtle">
                  Your role can review applications but not decide on them.
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
