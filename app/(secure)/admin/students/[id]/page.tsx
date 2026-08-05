import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, requireStudentAccess, AuthorizationError } from "@/lib/dal";
import { can } from "@/lib/auth/roles";
import { findStudent, loadStudentRecords, summarizeAttendance } from "@/lib/queries/records";
import {
  toStudentDetail,
  toAttendanceItem,
  toMasteryItem,
  toBehaviorItem,
  toTaekwondoItem,
} from "@/lib/dto";
import { logAudit } from "@/lib/audit";
import { attendanceCodes, behaviorPillars, cohorts } from "@/lib/site";
import SecureHeader from "@/app/components/secure/SecureHeader";
import { ADMIN_NAV } from "@/app/components/secure/nav";
import { FactList } from "@/app/components/ui/PageHeader";
import { Callout } from "@/app/components/ui/Callout";
import { DataTable } from "@/app/components/ui/Table";
import {
  AttendanceForm,
  MasteryForm,
  BehaviorForm,
  TaekwondoForm,
} from "./record-forms";

export const metadata: Metadata = {
  title: "Student record",
  robots: { index: false, follow: false },
};

const IMMUNIZATION_LABELS: Record<string, string> = {
  recordsOnFile: "Immunization records on file",
  exemptionOnFile: "Valid exemption on file",
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The full student file — all four Document 6 record types in one view, with entry forms.
 *
 * TWO INDEPENDENT AUTHORIZATION GATES:
 *   1. requireUser()                    — is this someone signed in?
 *   2. requireStudentAccess(id, "read") — may they see THIS student?
 *
 * Gate 2 checks capability *and* scope, with scope derived from the stored user document
 * rather than anything in the URL. That is what makes a guessed student id fail for an
 * instructor outside their assignment, or for a parent looking at another family's child.
 *
 * Reading this page is audited: it exposes medical and behavioral detail, and FERPA cares
 * who has seen a record as much as who changed it.
 */
export default async function StudentDetailPage({
  params,
}: PageProps<"/admin/students/[id]">) {
  const user = await requireUser();
  if (user.role === "parent") redirect("/portal");

  const { id } = await params;

  // Scope check before the record is loaded. Throwing an AuthorizationError here surfaces
  // as a 404-equivalent rather than "exists but forbidden" — which would itself confirm
  // that a student with that id exists.
  try {
    await requireStudentAccess(id, "read");
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }

  const doc = await findStudent(id);
  if (!doc) notFound();

  const student = toStudentDetail(doc, user);
  const records = await loadStudentRecords(id);

  await logAudit({
    actor: user,
    action: "student.read",
    subjectId: doc._id,
    subjectType: "student",
  });

  const attendance = records.attendance.map(toAttendanceItem);
  const mastery = records.mastery.map(toMasteryItem);
  const behavior = records.behavior.map(toBehaviorItem);
  const taekwondo = records.taekwondo.map(toTaekwondoItem);

  const summary = summarizeAttendance(records.attendance);
  const mayWrite = can(user.role, "records:write");
  const cohort = cohorts.find((c) => c.id === student.cohort);
  const pillarName = (id: string) =>
    behaviorPillars.find((p) => p.id === id)?.name ?? id;

  return (
    <>
      <SecureHeader user={user} nav={ADMIN_NAV} />

      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8"
      >
        <Link
          href="/admin/students"
          className="text-sm font-medium text-navy-700 hover:text-navy-900"
        >
          &larr; All students
        </Link>

        <h1 className="mt-4 font-serif text-3xl font-bold text-navy-900">
          {student.legalName}
        </h1>
        <p className="mt-1 text-sm text-ink-subtle">
          {cohort ? `${cohort.name} cohort · ` : ""}
          {student.gradeLevel} · {student.status}
        </p>

        {/* Handbook thresholds, computed rather than remembered. */}
        {summary.needsReentryMeeting || summary.chronicAbsence ? (
          <div className="mt-6 flex flex-col gap-3">
            {summary.needsReentryMeeting ? (
              <Callout title="Re-entry meeting required" variant="statute">
                {summary.consecutiveAbsences} consecutive absences. Handbook §4.5
                requires a re-entry meeting with the Head of School after three.
              </Callout>
            ) : null}
            {summary.chronicAbsence ? (
              <Callout title="Student Support Plan triggered" variant="statute">
                {(summary.absenceRate * 100).toFixed(0)}% of recorded instructional days
                missed. Handbook §4.5 triggers a Student Support Plan above 10%.
              </Callout>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-8 lg:col-span-2">
            {/* Identity */}
            <section>
              <h2 className="font-serif text-lg font-bold text-navy-900">Details</h2>
              <div className="mt-3">
                <FactList
                  items={[
                    { label: "Date of birth", value: fmt(student.dateOfBirth) },
                    { label: "Enrolled", value: fmt(student.enrollmentStartDate) },
                    { label: "Guardian", value: student.guardian.name },
                    {
                      label: "Guardian phone",
                      value: (
                        <a href={`tel:${student.guardian.phone}`} className="text-navy-700 underline">
                          {student.guardian.phone}
                        </a>
                      ),
                    },
                    {
                      label: "Guardian email",
                      value: (
                        <a href={`mailto:${student.guardian.email}`} className="text-navy-700 underline">
                          {student.guardian.email}
                        </a>
                      ),
                    },
                    {
                      label: "Emergency contact",
                      value: student.guardian.emergencyContactName
                        ? `${student.guardian.emergencyContactName} — ${student.guardian.emergencyContactPhone ?? "no phone"}`
                        : "—",
                    },
                    {
                      label: "Media release",
                      value:
                        student.mediaRelease === "consent"
                          ? "Consents to photos and video"
                          : "DOES NOT consent to photos or video",
                    },
                    ...(student.applicationId
                      ? [
                          {
                            label: "Source",
                            value: (
                              <Link
                                href={`/admin/applications/${student.applicationId}`}
                                className="text-navy-700 underline"
                              >
                                View signed enrollment agreement
                              </Link>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </section>

            {/* Medical */}
            {student.medical ? (
              <section>
                <h2 className="font-serif text-lg font-bold text-navy-900">
                  Medical &amp; health
                </h2>
                <p className="mt-1 text-xs text-ink-subtle">
                  Confidential. Your access has been logged.
                </p>
                <div className="mt-3">
                  <FactList
                    items={[
                      {
                        label: "Conditions / allergies",
                        value: student.medical.conditionsAndAllergies ?? "None reported",
                      },
                      {
                        label: "Medications",
                        value: student.medical.medications ?? "None reported",
                      },
                      { label: "Doctor", value: student.medical.doctorName ?? "—" },
                      { label: "Doctor phone", value: student.medical.doctorPhone ?? "—" },
                      {
                        label: "Immunization",
                        value:
                          IMMUNIZATION_LABELS[student.medical.immunizationStatus] ??
                          student.medical.immunizationStatus,
                      },
                    ]}
                  />
                </div>
              </section>
            ) : null}

            {/* Template A */}
            <section>
              <h2 className="font-serif text-lg font-bold text-navy-900">
                Attendance <span className="text-sm font-normal text-ink-subtle">(Template A)</span>
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {summary.totalDays} days recorded · {summary.present} present ·{" "}
                {summary.absentUnexcused} unexcused · {summary.excused} excused ·{" "}
                {summary.tardy} tardy
              </p>
              {attendance.length > 0 ? (
                <div className="mt-3">
                  <DataTable
                    caption="Attendance history, newest first"
                    headers={["Date", "Code", "Notes"]}
                    rowHeaders
                    rows={attendance
                      .slice(0, 20)
                      .map((r) => [
                        r.date,
                        `${r.code} — ${attendanceCodes[r.code as keyof typeof attendanceCodes]?.label ?? ""}`,
                        r.notes ?? "—",
                      ])}
                  />
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-subtle">No attendance recorded yet.</p>
              )}
            </section>

            {/* Template B */}
            <section>
              <h2 className="font-serif text-lg font-bold text-navy-900">
                Mastery log <span className="text-sm font-normal text-ink-subtle">(Template B)</span>
              </h2>
              {mastery.length > 0 ? (
                <div className="mt-3">
                  <DataTable
                    caption="Skill mastery, most recent first"
                    headers={["Subject", "Skill / unit", "Mastered", "Method"]}
                    rowHeaders
                    rows={mastery.map((m) => [
                      m.subject,
                      m.inferred ? `${m.skill} (credited from a complex task)` : m.skill,
                      fmt(m.dateMastered),
                      m.assessmentMethod,
                    ])}
                  />
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-subtle">No mastery recorded yet.</p>
              )}
            </section>

            {/* Template C */}
            <section>
              <h2 className="font-serif text-lg font-bold text-navy-900">
                Pivotal behavior <span className="text-sm font-normal text-ink-subtle">(Template C)</span>
              </h2>
              {behavior.length > 0 ? (
                <div className="mt-3">
                  <DataTable
                    caption="Behavioral progress on the five-point generalization scale"
                    headers={["Pillar", "Target behavior", "Level", "Notes"]}
                    rowHeaders
                    rows={behavior.map((b) => [
                      pillarName(b.pillar),
                      b.targetBehavior,
                      `${b.level} / 5`,
                      b.notes ?? "—",
                    ])}
                  />
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-subtle">
                  No behavioral records yet.
                </p>
              )}
            </section>

            {/* Template D */}
            <section>
              <h2 className="font-serif text-lg font-bold text-navy-900">
                Taekwondo progression <span className="text-sm font-normal text-ink-subtle">(Template D)</span>
              </h2>
              {taekwondo.length > 0 ? (
                <div className="mt-3">
                  <DataTable
                    caption="Belt rank history"
                    headers={["Rank", "Requirements demonstrated", "Date", "Assessed by"]}
                    rowHeaders
                    rows={taekwondo.map((t) => [
                      t.rank,
                      t.requirementsDemonstrated,
                      fmt(t.assessmentDate),
                      t.assessedBy,
                    ])}
                  />
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-subtle">No ranks recorded yet.</p>
              )}
            </section>
          </div>

          {/* Entry forms */}
          <aside className="flex flex-col gap-6">
            {mayWrite ? (
              <>
                {[
                  { title: "Record attendance", Form: AttendanceForm },
                  { title: "Record mastery", Form: MasteryForm },
                  { title: "Record behavior", Form: BehaviorForm },
                  { title: "Record Taekwondo rank", Form: TaekwondoForm },
                ].map(({ title, Form }) => (
                  <div key={title} className="rounded-2xl border border-line bg-white p-6">
                    <h2 className="font-serif text-base font-bold text-navy-900">
                      {title}
                    </h2>
                    <div className="mt-4">
                      <Form studentId={student.id} />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="rounded-2xl border border-line bg-white p-6">
                <p className="text-sm text-ink-subtle">
                  Your role has read-only access to this record.
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
