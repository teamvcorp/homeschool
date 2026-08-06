"use server";

import { z } from "zod";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import {
  attendanceCollection,
  masteryCollection,
  behaviorCollection,
  taekwondoCollection,
} from "../db/collections";
import {
  ATTENDANCE_CODES,
  SUBJECTS,
  ASSESSMENT_METHODS,
  BEHAVIOR_PILLAR_IDS,
  BELT_RANKS,
  GENERALIZATION_LEVELS,
} from "../db/enums";
import { requireStudentAccess } from "../dal";
import { logAudit } from "../audit";
import { type ActionState, guardAction, success, fromZodError } from "./types";

/**
 * STUDENT RECORD ACTIONS — Document 6, Templates A–D
 * =============================================================================
 * Attendance, mastery, behavioral, and Taekwondo record entry.
 *
 * EVERY ACTION FOLLOWS THE SAME SHAPE, and new ones must too:
 *
 *   1. requireStudentAccess(studentId, "write")   ← FIRST. Capability AND scope.
 *   2. zod parse
 *   3. write
 *   4. logAudit
 *   5. revalidatePath
 *
 * Step 1 is doing two distinct jobs: confirming the role may write records at all, and
 * confirming *this* student is in the caller's scope. Scope comes from the stored user
 * document, never from the submitted form, so an instructor cannot reach a student
 * outside their assignment by editing a hidden field.
 */

const objectId = z.string().refine((v) => ObjectId.isValid(v), "Invalid student id");

/** "YYYY-MM-DD" — a school day, not an instant. See the note in lib/db/types.ts. */
const calendarDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD form");

/** A date input converted to a Date at UTC noon, avoiding timezone day-shift. */
const dateAtNoon = calendarDay.transform((v) => new Date(`${v}T12:00:00.000Z`));

const notes = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((v) => (v === "" ? undefined : v));

/* ------------------------- Template A — attendance ------------------------- */

const attendanceSchema = z.object({
  studentId: objectId,
  date: calendarDay,
  code: z.enum(ATTENDANCE_CODES, { error: "Choose an attendance code" }),
  notes,
});

/**
 * Records or corrects one student's attendance for one day.
 *
 * An upsert rather than an insert, matching the unique (studentId, date) index: marking
 * a student present and then correcting it to excused should amend the day's record,
 * not create a duplicate the index would reject.
 */
export async function recordAttendanceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction("recordAttendance", async () => {
    const parsed = attendanceSchema.safeParse({
      studentId: formData.get("studentId"),
      date: formData.get("date"),
      code: formData.get("code"),
      notes: formData.get("notes") ?? undefined,
    });
    if (!parsed.success) return fromZodError(parsed.error);

    const { studentId, date, code, notes: note } = parsed.data;
    const user = await requireStudentAccess(studentId, "write");

    const attendance = await attendanceCollection();
    const now = new Date();

    await attendance.updateOne(
      { studentId: new ObjectId(studentId), date },
      {
        $set: {
          code,
          notes: note,
          recordedBy: new ObjectId(user.id),
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now, archivedAt: null },
      },
      { upsert: true },
    );

    await logAudit({
      actor: user,
      action: "attendance.record",
      subjectId: studentId,
      subjectType: "student",
      meta: { date, code },
    });

    revalidatePath(`/admin/students/${studentId}`);
    return success(undefined, `Attendance recorded for ${date}.`);
  });
}

/* --------------------------- Template B — mastery -------------------------- */

const masterySchema = z.object({
  studentId: objectId,
  subject: z.enum(SUBJECTS, { error: "Choose a subject" }),
  skill: z.string().trim().min(1, "Describe the skill or unit").max(300),
  dateMastered: dateAtNoon,
  assessmentMethod: z.enum(ASSESSMENT_METHODS, {
    error: "Choose how mastery was assessed",
  }),
  schoolYear: z.string().trim().min(1, "School year is required").max(20),
  /**
   * Set when this skill is being credited via hierarchical competency assessment —
   * mastery of a complex task counting as proof of a constituent skill (Document 3
   * §3.5). Records which demonstration supplied the evidence, so the log shows the
   * inference rather than implying a separate assessment took place.
   */
  inferredFromMasteryId: z
    .string()
    .optional()
    .transform((v) => (v && ObjectId.isValid(v) ? new ObjectId(v) : null)),
  notes,
});

export async function recordMasteryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction("recordMastery", async () => {
    const parsed = masterySchema.safeParse({
      studentId: formData.get("studentId"),
      subject: formData.get("subject"),
      skill: formData.get("skill"),
      dateMastered: formData.get("dateMastered"),
      assessmentMethod: formData.get("assessmentMethod"),
      schoolYear: formData.get("schoolYear"),
      inferredFromMasteryId: formData.get("inferredFromMasteryId") ?? undefined,
      notes: formData.get("notes") ?? undefined,
    });
    if (!parsed.success) return fromZodError(parsed.error);

    const d = parsed.data;
    const user = await requireStudentAccess(d.studentId, "write");

    const mastery = await masteryCollection();
    const now = new Date();

    await mastery.insertOne({
      studentId: new ObjectId(d.studentId),
      subject: d.subject,
      skill: d.skill,
      dateMastered: d.dateMastered,
      assessmentMethod: d.assessmentMethod,
      schoolYear: d.schoolYear,
      inferredFromMasteryId: d.inferredFromMasteryId,
      notes: d.notes,
      recordedBy: new ObjectId(user.id),
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });

    await logAudit({
      actor: user,
      action: "mastery.record",
      subjectId: d.studentId,
      subjectType: "student",
      meta: { subject: d.subject, skill: d.skill.slice(0, 80) },
    });

    revalidatePath(`/admin/students/${d.studentId}`);
    return success(undefined, `Mastery recorded: ${d.skill}.`);
  });
}

/* -------------------------- Template C — behavior -------------------------- */

const behaviorSchema = z.object({
  studentId: objectId,
  period: z.string().trim().min(1, "Reporting period is required").max(40),
  pillar: z.enum(BEHAVIOR_PILLAR_IDS, { error: "Choose a pillar" }),
  targetBehavior: z.string().trim().min(1, "Target behavior is required").max(200),
  level: z.coerce
    .number()
    .int()
    .refine(
      (n): n is (typeof GENERALIZATION_LEVELS)[number] =>
        GENERALIZATION_LEVELS.includes(n as 1 | 2 | 3 | 4 | 5),
      "Level must be 1 to 5",
    ),
  notes,
});

export async function recordBehaviorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction("recordBehavior", async () => {
    const parsed = behaviorSchema.safeParse({
      studentId: formData.get("studentId"),
      period: formData.get("period"),
      pillar: formData.get("pillar"),
      targetBehavior: formData.get("targetBehavior"),
      level: formData.get("level"),
      notes: formData.get("notes") ?? undefined,
    });
    if (!parsed.success) return fromZodError(parsed.error);

    const d = parsed.data;
    const user = await requireStudentAccess(d.studentId, "write");

    const behavior = await behaviorCollection();
    const now = new Date();

    await behavior.insertOne({
      studentId: new ObjectId(d.studentId),
      period: d.period,
      pillar: d.pillar,
      targetBehavior: d.targetBehavior,
      level: d.level,
      notes: d.notes,
      recordedBy: new ObjectId(user.id),
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });

    await logAudit({
      actor: user,
      action: "behavior.record",
      subjectId: d.studentId,
      subjectType: "student",
      // Level and pillar only. The narrative note stays out of the audit log — see the
      // rule in lib/audit.ts about not widening exposure of sensitive content.
      meta: { pillar: d.pillar, level: d.level },
    });

    revalidatePath(`/admin/students/${d.studentId}`);
    return success(undefined, "Behavioral record saved.");
  });
}

/* ------------------------- Template D — Taekwondo -------------------------- */

const taekwondoSchema = z.object({
  studentId: objectId,
  rank: z.enum(BELT_RANKS, { error: "Choose a belt rank" }),
  requirementsDemonstrated: z
    .string()
    .trim()
    .min(1, "Describe what was demonstrated")
    .max(2000),
  assessmentDate: dateAtNoon,
  /** Free text: assessors may be external examiners without accounts here. */
  assessedBy: z.string().trim().min(1, "Who assessed this?").max(200),
});

export async function recordTaekwondoRankAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction("recordTaekwondoRank", async () => {
    const parsed = taekwondoSchema.safeParse({
      studentId: formData.get("studentId"),
      rank: formData.get("rank"),
      requirementsDemonstrated: formData.get("requirementsDemonstrated"),
      assessmentDate: formData.get("assessmentDate"),
      assessedBy: formData.get("assessedBy"),
    });
    if (!parsed.success) return fromZodError(parsed.error);

    const d = parsed.data;
    const user = await requireStudentAccess(d.studentId, "write");

    const taekwondo = await taekwondoCollection();
    const now = new Date();

    await taekwondo.insertOne({
      studentId: new ObjectId(d.studentId),
      rank: d.rank,
      requirementsDemonstrated: d.requirementsDemonstrated,
      assessmentDate: d.assessmentDate,
      assessedBy: d.assessedBy,
      recordedBy: new ObjectId(user.id),
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });

    await logAudit({
      actor: user,
      action: "taekwondo.record",
      subjectId: d.studentId,
      subjectType: "student",
      meta: { rank: d.rank },
    });

    revalidatePath(`/admin/students/${d.studentId}`);
    return success(undefined, `${d.rank} recorded.`);
  });
}
