import "server-only";
import { ObjectId } from "mongodb";
import {
  applicationsCollection,
  studentsCollection,
  attendanceCollection,
  masteryCollection,
  behaviorCollection,
  taekwondoCollection,
} from "../db/collections";
import { attendancePolicy } from "../site";
import { APPLICATION_STATUSES, type ApplicationStatus, type AttendanceCode } from "../db/enums";

/**
 * READ HELPERS
 * =============================================================================
 * Queries used by the admin and portal screens.
 *
 * These do NOT check authorization — that is the caller's job, via lib/dal.ts, before
 * calling in. Mixing "can this person see it" into "fetch it" makes both harder to
 * audit, and a query helper that sometimes enforces and sometimes does not is worse
 * than one that never does.
 *
 * Every helper takes explicit projections. A record screen loads what it renders.
 */

/**
 * Applications, newest first, optionally filtered by status.
 *
 * `status` is typed as the enum rather than `string` deliberately: the typed collection
 * rejected a plain string here, which is the check working. A status filter taken
 * straight from a query parameter would silently match nothing and render an empty list
 * that looks like "no applications" rather than "bad filter". Callers must narrow the
 * value first — see `parseApplicationStatus`.
 */
export async function listApplications(status?: ApplicationStatus) {
  const applications = await applicationsCollection();
  return applications
    .find(status ? { status } : {}, { sort: { submittedAt: -1 }, limit: 200 })
    .toArray();
}

/** Narrows an untrusted query-string value to a real status, or undefined. */
export function parseApplicationStatus(
  value: unknown,
): ApplicationStatus | undefined {
  return typeof value === "string" &&
    (APPLICATION_STATUSES as readonly string[]).includes(value)
    ? (value as ApplicationStatus)
    : undefined;
}

export async function countApplicationsByStatus(): Promise<Record<string, number>> {
  const applications = await applicationsCollection();
  const rows = await applications
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();
  return Object.fromEntries(rows.map((r) => [r._id, r.count]));
}

export async function findApplication(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const applications = await applicationsCollection();
  return applications.findOne({ _id: new ObjectId(id) });
}

export async function listStudents(includeArchived = false) {
  const students = await studentsCollection();
  return students
    .find(includeArchived ? {} : { archivedAt: null }, {
      sort: { legalName: 1 },
      limit: 500,
    })
    .toArray();
}

export async function findStudent(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const students = await studentsCollection();
  return students.findOne({ _id: new ObjectId(id) });
}

/** All four record types for one student, fetched concurrently. */
export async function loadStudentRecords(studentId: string) {
  if (!ObjectId.isValid(studentId)) {
    return { attendance: [], mastery: [], behavior: [], taekwondo: [] };
  }
  const oid = new ObjectId(studentId);

  const [attendanceCol, masteryCol, behaviorCol, taekwondoCol] = await Promise.all([
    attendanceCollection(),
    masteryCollection(),
    behaviorCollection(),
    taekwondoCollection(),
  ]);

  const [attendance, mastery, behavior, taekwondo] = await Promise.all([
    attendanceCol
      .find({ studentId: oid }, { sort: { date: -1 }, limit: 120 })
      .toArray(),
    masteryCol
      .find({ studentId: oid }, { sort: { dateMastered: -1 }, limit: 200 })
      .toArray(),
    behaviorCol
      .find({ studentId: oid }, { sort: { createdAt: -1 }, limit: 100 })
      .toArray(),
    taekwondoCol
      .find({ studentId: oid }, { sort: { assessmentDate: -1 }, limit: 50 })
      .toArray(),
  ]);

  return { attendance, mastery, behavior, taekwondo };
}

/* --------------------------- attendance analytics -------------------------- */

export interface AttendanceSummary {
  totalDays: number;
  present: number;
  absentUnexcused: number;
  excused: number;
  tardy: number;
  /** Share of instructional days missed, counting both absence types. */
  absenceRate: number;
  /** Document 4 §4.5 — more than 10% triggers a Student Support Plan. */
  chronicAbsence: boolean;
  /** Document 4 §4.5 — 3+ consecutive absences require a re-entry meeting. */
  consecutiveAbsences: number;
  needsReentryMeeting: boolean;
}

/**
 * Computes the two attendance thresholds the handbook actually commits the school to.
 *
 * These exist so the rules are enforced by the system rather than by someone
 * remembering to count — which is exactly the kind of thing an accreditation reviewer
 * asks how you track.
 *
 * Records must be supplied newest-first (as loadStudentRecords returns them).
 */
export function summarizeAttendance(
  records: readonly { date: string; code: AttendanceCode }[],
): AttendanceSummary {
  const counts = { P: 0, A: 0, E: 0, T: 0 };
  for (const r of records) counts[r.code] += 1;

  const totalDays = records.length;
  const missed = counts.A + counts.E;
  const absenceRate = totalDays === 0 ? 0 : missed / totalDays;

  // Consecutive run of absences at the most recent end of the log. Tardy does not
  // break a run (the student was present); a present day does.
  let consecutive = 0;
  for (const r of records) {
    if (r.code === "A" || r.code === "E") consecutive += 1;
    else break;
  }

  return {
    totalDays,
    present: counts.P,
    absentUnexcused: counts.A,
    excused: counts.E,
    tardy: counts.T,
    absenceRate,
    chronicAbsence: absenceRate > attendancePolicy.chronicAbsenceRate,
    consecutiveAbsences: consecutive,
    needsReentryMeeting:
      consecutive >= attendancePolicy.consecutiveAbsenceThreshold,
  };
}

/**
 * The four most recent instructional days (Monday–Thursday), newest first.
 *
 * The school runs a four-day week year-round, so a Friday/weekend column in the
 * attendance grid would be permanently empty and invite mis-entry.
 */
export function recentInstructionalDays(count = 4, from = new Date()): string[] {
  const days: string[] = [];
  const cursor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );

  while (days.length < count) {
    const dayOfWeek = cursor.getUTCDay(); // 0 Sun … 6 Sat
    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      days.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return days;
}
