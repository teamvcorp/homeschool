import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, requireStudentAccess, AuthorizationError } from "@/lib/dal";
import { findStudent, findApplication } from "@/lib/queries/records";
import { logAudit } from "@/lib/audit";
import { school, addressLine, tuition } from "@/lib/site";
import { ACKNOWLEDGMENT_LIST, AGREEMENT_PREAMBLE } from "@/lib/enrollment/agreement";
import { Crest } from "@/app/components/ui/Crest";
import PrintButton from "@/app/components/PrintButton";

export const metadata: Metadata = {
  title: "Executed enrollment agreement",
  robots: { index: false, follow: false },
};

const ESA_LABELS: Record<string, string> = {
  intendsToApply: "Applying for Iowa Education Savings Account (ESA) funding",
  payingDirectly: `Paying the $${tuition.monthlyContribution} monthly contribution directly`,
  requestingHardship: "Applying for financial hardship consideration",
};

const IMMUNIZATION_LABELS: Record<string, string> = {
  recordsOnFile: "Immunization records on file",
  exemptionOnFile: "Valid immunization exemption on file",
};

function fmtDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtDateTime(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleString("en-US", { timeZone: "UTC" }) + " UTC";
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="print-keep grid gap-0.5 border-b border-line py-2 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-semibold text-navy-900">{label}</dt>
      <dd className="text-sm text-ink sm:col-span-2">{value}</dd>
    </div>
  );
}

/**
 * THE EXECUTED ENROLLMENT AGREEMENT, as a printable document.
 *
 * WHY THIS IS A SEPARATE PAGE FROM THE APPLICATION REVIEW SCREEN
 *
 * /admin/applications/[id] is a WORKSPACE: every field, plus the forms that advance
 * status, countersign, and promote. This page is the DOCUMENT — letterhead, the agreement
 * wording as presented, both signature blocks, and the E-SIGN attestation, with the app's
 * chrome suppressed for print. Two different jobs; collapsing them would make the review
 * screen unprintable and the document un-actionable.
 *
 * This is the artifact the school hands to an Iowa DE reviewer, and the copy the school
 * sends a family that asks for one. Document 6 §6.1 promises families access to their
 * student's records on request; because this site is enrollment-only and has no family
 * login (see the division of intent on `dailyApp` in lib/site.ts), that promise is kept by
 * a staff member printing this page rather than by self-service. If that ever becomes a
 * burden, the fix is a signed expiring link — NOT a family login area on this app.
 *
 * TWO INDEPENDENT AUTHORIZATION GATES, same as the student file:
 *   1. requireUser()                    — is this someone signed in?
 *   2. requireStudentAccess(id, "read") — may they see THIS student?
 *
 * Scope is checked against the STUDENT, and the application is then loaded through the
 * student's own `applicationId`. That ordering matters: scoping on the application id
 * directly would need a second, parallel scope mechanism, and two mechanisms are one more
 * than can be kept correct.
 *
 * Reading this is audited as a document access. It reproduces medical detail in full, so
 * under FERPA it is exactly the kind of read that has to leave a trace.
 */
export default async function ExecutedAgreementPage({
  params,
}: PageProps<"/admin/students/[id]/agreement">) {
  const user = await requireUser();
  // No family area exists on this site; a parent session has nothing to reach here.
  // See the note in lib/actions/auth.ts on why this is unreachable by construction.
  if (user.role === "parent") redirect("/");

  const { id } = await params;

  try {
    await requireStudentAccess(id, "read");
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }

  const student = await findStudent(id);
  if (!student?.applicationId) notFound();

  const application = await findApplication(student.applicationId.toString());
  if (!application) notFound();

  await logAudit({
    actor: user,
    action: "document.download",
    subjectId: application._id,
    subjectType: "application",
    meta: { document: "enrollmentAgreement" },
  });

  const sig = application.guardianSignature;
  const counter = application.headOfSchoolSignature;

  return (
    <div className="min-h-full bg-surface-muted">
      {/* Screen-only controls */}
      <div className="no-print border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href={`/admin/students/${id}`}
            className="text-sm font-medium text-navy-700 hover:text-navy-900"
          >
            &larr; Back to student file
          </Link>
          <PrintButton />
        </div>
      </div>

      {/*
        Screen-only guidance. Deliberately not printed — it is an instruction to staff,
        not part of the executed agreement, and it must never appear on the copy that
        goes to a reviewer or a family.
      */}
      <div className="no-print mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        <div className="rounded-xl border border-line border-l-4 border-l-gold-400 bg-white p-4">
          <p className="text-sm leading-relaxed text-ink-muted">
            <strong className="text-navy-900">This is the family&rsquo;s copy.</strong>{" "}
            Print or save to PDF when a family requests their agreement, or when the
            accreditation packet needs an executed example. The signature evidence below
            &mdash; timestamp, origin IP, and the agreement fingerprint &mdash; is part of
            the record and prints with it.
          </p>
        </div>
      </div>

      <main id="main" className="mx-auto max-w-4xl bg-white px-6 py-10 shadow-sm sm:px-12">
        {/* Letterhead */}
        <header className="print-keep mb-8 border-b-2 border-navy-800 pb-6">
          <div className="flex items-start gap-4">
            <Crest size={56} eager />
            <div>
              <p className="font-serif text-xl font-bold leading-tight text-navy-900">
                {school.legalName}
              </p>
              <p className="font-serif text-base text-gold-700">{school.dbaName}</p>
              <p className="mt-1 text-xs italic text-ink-subtle">{school.tagline}</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-ink-subtle">
            {addressLine} &middot; {school.phone} &middot; {school.email}
          </p>
        </header>

        <h1 className="font-serif text-2xl font-bold text-navy-900">
          Family Enrollment Agreement
        </h1>
        <p className="mt-1 text-sm text-ink-subtle">
          Executed {fmtDate(sig.signedAt)} &middot; Consent version {sig.consentVersion}
        </p>

        <h2 className="mt-8 font-serif text-lg font-bold text-navy-900">Student</h2>
        <dl className="mt-2">
          <Row label="Legal name" value={application.studentLegalName} />
          <Row label="Date of birth" value={fmtDate(application.dateOfBirth)} />
          <Row label="Grade level" value={application.gradeLevel} />
          <Row label="Enrollment start" value={fmtDate(application.enrollmentStartDate)} />
        </dl>

        <h2 className="mt-8 font-serif text-lg font-bold text-navy-900">
          Parent / guardian
        </h2>
        <dl className="mt-2">
          <Row label="Name(s)" value={application.guardian.name} />
          <Row label="Address" value={application.guardian.address} />
          <Row label="Phone" value={application.guardian.phone} />
          <Row label="Email" value={application.guardian.email} />
          {application.guardian.emergencyContactName ? (
            <Row
              label="Emergency contact"
              value={`${application.guardian.emergencyContactName} — ${application.guardian.emergencyContactPhone ?? "no phone given"}`}
            />
          ) : null}
        </dl>

        <h2 className="mt-8 font-serif text-lg font-bold text-navy-900">
          Iowa ESA / school choice
        </h2>
        <dl className="mt-2">
          <Row
            label="Election"
            value={ESA_LABELS[application.esaElection] ?? application.esaElection}
          />
        </dl>

        <h2 className="mt-8 font-serif text-lg font-bold text-navy-900">
          Program acknowledgments
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {AGREEMENT_PREAMBLE}
        </p>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5">
          {ACKNOWLEDGMENT_LIST.map((ack) => (
            <li key={ack.key} className="print-keep text-sm leading-relaxed text-ink">
              {ack.text}
              <span
                className={`ml-2 font-semibold ${
                  application.acknowledgments[ack.key]
                    ? "text-crest-green-700"
                    : "text-crest-red-700"
                }`}
              >
                {application.acknowledgments[ack.key] ? "— Accepted" : "— NOT accepted"}
              </span>
            </li>
          ))}
        </ol>

        <h2 className="mt-8 font-serif text-lg font-bold text-navy-900">
          Medical &amp; health
        </h2>
        <dl className="mt-2">
          <Row
            label="Conditions / allergies"
            value={application.medical.conditionsAndAllergies ?? "None reported"}
          />
          <Row
            label="Medications"
            value={application.medical.medications ?? "None reported"}
          />
          <Row label="Doctor / clinic" value={application.medical.doctorName ?? "—"} />
          <Row label="Doctor phone" value={application.medical.doctorPhone ?? "—"} />
          <Row
            label="Immunization"
            value={
              IMMUNIZATION_LABELS[application.medical.immunizationStatus] ??
              application.medical.immunizationStatus
            }
          />
        </dl>

        <h2 className="mt-8 font-serif text-lg font-bold text-navy-900">
          Photo &amp; media release
        </h2>
        <p
          className={`mt-2 text-sm font-semibold ${
            application.mediaRelease === "consent"
              ? "text-crest-green-700"
              : "text-crest-red-700"
          }`}
        >
          {application.mediaRelease === "consent"
            ? "Consent given for promotional photographs and video."
            : "Consent NOT given. This student's image may not be used for promotional purposes."}
        </p>

        {/* Signature evidence */}
        <h2 className="mt-8 font-serif text-lg font-bold text-navy-900">Signatures</h2>
        <div className="mt-3 grid gap-6 sm:grid-cols-2">
          <div className="print-keep rounded-lg border border-line bg-surface-muted p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gold-700">
              Parent / guardian
            </p>
            <p className="mt-2 font-serif text-lg text-navy-900">{sig.typedName}</p>
            <p className="mt-1 text-xs text-ink-subtle">
              Signed electronically {fmtDateTime(sig.signedAt)}
            </p>
            <p className="mt-1 text-xs text-ink-subtle">
              Intent to sign affirmed: {sig.intentAffirmed ? "yes" : "no"}
            </p>
            {sig.ip ? (
              <p className="mt-1 text-xs text-ink-subtle">Origin IP: {sig.ip}</p>
            ) : null}
          </div>

          <div className="print-keep rounded-lg border border-line bg-surface-muted p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gold-700">
              Head of School
            </p>
            {counter ? (
              <>
                <p className="mt-2 font-serif text-lg text-navy-900">
                  {counter.typedName}
                </p>
                <p className="mt-1 text-xs text-ink-subtle">
                  Countersigned {fmtDateTime(counter.signedAt)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-subtle">
                Awaiting countersignature.
              </p>
            )}
          </div>
        </div>

        <div className="print-keep mt-8 border-t border-line pt-4">
          <p className="text-xs leading-relaxed text-ink-subtle">
            This agreement was signed electronically. Under the federal E-SIGN Act and the
            Iowa Uniform Electronic Transactions Act (Iowa Code ch. 554D), an electronic
            signature has the same legal effect as a handwritten one where the signer
            intended to sign and can be attributed.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
            Agreement fingerprint (SHA-256):{" "}
            <code className="break-all">{sig.agreementHash}</code>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
            This fingerprint identifies the exact wording presented at signing. If the
            agreement text is ever revised, this record continues to identify what was
            agreed to on {fmtDate(sig.signedAt)}.
          </p>
        </div>
      </main>
    </div>
  );
}
