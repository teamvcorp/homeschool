import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, requireStudentAccess, AuthorizationError } from "@/lib/dal";
import { findStudent, loadStudentRecords, summarizeAttendance } from "@/lib/queries/records";
import {
  toStudentDetail,
  toAttendanceItem,
  toMasteryItem,
  toBehaviorItem,
  toTaekwondoItem,
} from "@/lib/dto";
import { logAudit } from "@/lib/audit";
import { attendanceCodes, behaviorPillars, cohorts, school } from "@/lib/site";
import SecureHeader from "@/app/components/secure/SecureHeader";
import { PORTAL_NAV } from "@/app/components/secure/nav";
import { Callout } from "@/app/components/ui/Callout";
import { DataTable } from "@/app/components/ui/Table";

export const metadata: Metadata = {
  title: "Student record",
  robots: { index: false, follow: false },
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
 * A guardian's read-only view of their own child's record.
 *
 * Implements the commitment in Document 6 §6.1 — families may access their student's
 * records at any time — as self-service rather than a phone call.
 *
 * THE SCOPE CHECK IS THE ENTIRE POINT OF THIS FILE. `requireStudentAccess` compares the
 * requested id against `studentIds` on the *stored* user document, so a guardian who
 * edits the URL to another family's student id gets a 404. It fails as
 * not-found rather than forbidden deliberately: "forbidden" would itself confirm that a
 * student with that id exists.
 *
 * Read access is audited, because under FERPA who has *seen* a record matters as much as
 * who changed it — and that includes the family, whose access is a legitimate event
 * worth recording.
 *
 * Note there are no entry forms here. A guardian has `records:read:own-children` and no
 * write capability, so even a hand-crafted POST to a record action would be rejected.
 */
export default async function PortalStudentPage({
  params,
}: PageProps<"/portal/students/[id]">) {
  const user = await requireUser();
  const { id } = await params;

  try {
    await requireStudentAccess(id, "read");
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }

  const doc = await findStudent(id);
  if (!doc) notFound();

  // Staff belong in the admin view, which has the entry forms.
  if (user.role !== "parent") redirect(`/admin/students/${id}`);

  const student = toStudentDetail(doc, user);
  const records = await loadStudentRecords(id);

  await logAudit({
    actor: user,
    action: "student.read",
    subjectId: doc._id,
    subjectType: "student",
    meta: { via: "portal" },
  });

  const attendance = records.attendance.map(toAttendanceItem);
  const mastery = records.mastery.map(toMasteryItem);
  const behavior = records.behavior.map(toBehaviorItem);
  const taekwondo = records.taekwondo.map(toTaekwondoItem);
  const summary = summarizeAttendance(records.attendance);

  const cohort = cohorts.find((c) => c.id === student.cohort);
  const pillarName = (pid: string) =>
    behaviorPillars.find((p) => p.id === pid)?.name ?? pid;

  return (
    <>
      <SecureHeader user={user} nav={PORTAL_NAV} />

      <main
        id="main"
        className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8"
      >
        <Link
          href="/portal"
          className="text-sm font-medium text-navy-700 hover:text-navy-900"
        >
          &larr; My students
        </Link>

        <h1 className="mt-4 font-serif text-3xl font-bold text-navy-900">
          {student.legalName}
        </h1>
        <p className="mt-1 text-sm text-ink-subtle">
          {cohort ? `${cohort.name} cohort · ` : ""}
          {student.gradeLevel}
        </p>

        {student.applicationId ? (
          <div className="mt-6">
            <Link
              href={`/portal/students/${student.id}/agreement`}
              className="inline-flex items-center gap-2 rounded-full bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-700"
            >
              View your signed enrollment agreement
            </Link>
          </div>
        ) : null}

        {/* Attendance */}
        <section className="mt-10">
          <h2 className="font-serif text-xl font-bold text-navy-900">Attendance</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {summary.totalDays} instructional days recorded · {summary.present} present ·{" "}
            {summary.absentUnexcused + summary.excused} absent · {summary.tardy} tardy
          </p>

          {summary.needsReentryMeeting ? (
            <div className="mt-4">
              <Callout title="Re-entry meeting needed">
                Our records show {summary.consecutiveAbsences} consecutive absences. The
                handbook asks for a short re-entry meeting with the Head of School before
                your student returns to their sequence &mdash; please call{" "}
                <a href={school.phoneHref}>{school.phone}</a>.
              </Callout>
            </div>
          ) : null}

          {attendance.length > 0 ? (
            <div className="mt-4">
              <DataTable
                caption="Recent attendance"
                headers={["Date", "Status", "Notes"]}
                rowHeaders
                rows={attendance
                  .slice(0, 20)
                  .map((r) => [
                    fmt(r.date),
                    attendanceCodes[r.code as keyof typeof attendanceCodes]?.label ??
                      r.code,
                    r.notes ?? "—",
                  ])}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-subtle">
              No attendance has been recorded yet.
            </p>
          )}
        </section>

        {/* Mastery */}
        <section className="mt-10">
          <h2 className="font-serif text-xl font-bold text-navy-900">
            Skills mastered
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            We do not use letter grades. This is the record of what your student can
            actually do, and when they demonstrated it.
          </p>
          {mastery.length > 0 ? (
            <div className="mt-4">
              <DataTable
                caption="Skills mastered, most recent first"
                headers={["Subject", "Skill", "Mastered", "How"]}
                rowHeaders
                rows={mastery.map((m) => [
                  m.subject,
                  m.skill,
                  fmt(m.dateMastered),
                  m.assessmentMethod,
                ])}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-subtle">
              No skills recorded yet. These accumulate as your student demonstrates
              mastery.
            </p>
          )}
        </section>

        {/* Behavior */}
        <section className="mt-10">
          <h2 className="font-serif text-xl font-bold text-navy-900">
            Character &amp; pivotal behavior
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Rated 1 to 5, where 5 means the skill generalizes across every environment.
          </p>
          {behavior.length > 0 ? (
            <div className="mt-4">
              <DataTable
                caption="Pivotal behavior progress"
                headers={["Pillar", "Behavior", "Level", "Notes"]}
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
            <p className="mt-4 text-sm text-ink-subtle">
              No behavioral records yet.
            </p>
          )}
        </section>

        {/* Taekwondo */}
        <section className="mt-10">
          <h2 className="font-serif text-xl font-bold text-navy-900">
            Taekwondo progression
          </h2>
          {taekwondo.length > 0 ? (
            <div className="mt-4">
              <DataTable
                caption="Belt rank history"
                headers={["Rank", "Date", "Assessed by"]}
                rowHeaders
                rows={taekwondo.map((t) => [
                  t.rank,
                  fmt(t.assessmentDate),
                  t.assessedBy,
                ])}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-subtle">No ranks recorded yet.</p>
          )}
        </section>

        <div className="mt-12">
          <Callout title="Questions about anything here?">
            Call <a href={school.phoneHref}>{school.phone}</a> or email{" "}
            <a href={`mailto:${school.email}`}>{school.email}</a>. Records are retained
            for at least seven years, and access to them is logged.
          </Callout>
        </div>
      </main>
    </>
  );
}
