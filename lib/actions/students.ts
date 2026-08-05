"use server";

import { z } from "zod";
import { ObjectId, MongoServerError } from "mongodb";
import { revalidatePath } from "next/cache";
import { studentsCollection } from "../db/collections";
import {
  COHORT_IDS,
  STUDENT_STATUSES,
  SCHOOL_EMAIL_STATUSES,
  IMMUNIZATION_STATUSES,
  MEDIA_RELEASE_CHOICES,
} from "../db/enums";
import { requireStudentAccess, requireCapability } from "../dal";
import { logAudit } from "../audit";
import {
  buildSchoolEmailLocalPart,
  resolveCollision,
  isPlausibleSchoolEmail,
  SCHOOL_EMAIL_DOMAIN,
} from "../school-email";
import { type ActionState, guardAction, failure, success, fromZodError } from "./types";

/**
 * STUDENT RECORD EDITING
 * =============================================================================
 * Correcting a student record after promotion — a misspelled name, a corrected date of
 * birth, a cohort move, the school ID, and the school email lifecycle.
 *
 * Every action starts with an authorization call before parsing anything. Editing a student
 * record is a `records:write` capability AND requires the student to be in the caller's
 * scope, so an instructor cannot amend a child they are not assigned to.
 */

const objectId = z.string().refine((v) => ObjectId.isValid(v), "Invalid student id");

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

/**
 * A calendar date at UTC noon.
 *
 * Noon rather than midnight: midnight in a negative-offset timezone formats back as the
 * previous day, which silently shifts a date of birth — and the date of birth feeds the
 * generated school email, so an off-by-one there would issue the wrong address.
 */
const calendarDate = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a valid date`)
    .transform((v) => new Date(`${v}T12:00:00.000Z`));

/* ------------------------------- core details ------------------------------- */

const updateStudentSchema = z.object({
  studentId: objectId,
  legalName: z.string().trim().min(1, "Legal name is required").max(120),
  dateOfBirth: calendarDate("Date of birth"),
  gradeLevel: z.string().trim().min(1, "Grade level is required").max(40),
  cohort: z.enum(COHORT_IDS, { error: "Choose a cohort" }),
  enrollmentStartDate: calendarDate("Enrollment start date"),
  status: z.enum(STUDENT_STATUSES, { error: "Choose a status" }),

  /** Free text — the school's own numbering convention, not generated here. */
  schoolId: optional(60),

  // Guardian contact
  guardianName: z.string().trim().min(1, "Guardian name is required").max(200),
  guardianEmail: z
    .string()
    .trim()
    .min(1, "Guardian email is required")
    .max(320)
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase()),
  guardianPhone: z.string().trim().min(1, "Guardian phone is required").max(40),
  guardianAddress: z.string().trim().min(1, "Address is required").max(300),
  emergencyContactName: optional(200),
  emergencyContactPhone: optional(40),

  // Medical
  conditionsAndAllergies: optional(2000),
  medications: optional(2000),
  doctorName: optional(200),
  doctorPhone: optional(40),
  immunizationStatus: z.enum(IMMUNIZATION_STATUSES, {
    error: "Choose the immunization documentation on file",
  }),

  mediaRelease: z.enum(MEDIA_RELEASE_CHOICES, {
    error: "Record the family's photo and media decision",
  }),

  notes: optional(4000),
});

export async function updateStudentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction(async () => {
    const parsed = updateStudentSchema.safeParse({
      studentId: formData.get("studentId"),
      legalName: formData.get("legalName"),
      dateOfBirth: formData.get("dateOfBirth"),
      gradeLevel: formData.get("gradeLevel"),
      cohort: formData.get("cohort"),
      enrollmentStartDate: formData.get("enrollmentStartDate"),
      status: formData.get("status"),
      schoolId: formData.get("schoolId") ?? undefined,
      guardianName: formData.get("guardianName"),
      guardianEmail: formData.get("guardianEmail"),
      guardianPhone: formData.get("guardianPhone"),
      guardianAddress: formData.get("guardianAddress"),
      emergencyContactName: formData.get("emergencyContactName") ?? undefined,
      emergencyContactPhone: formData.get("emergencyContactPhone") ?? undefined,
      conditionsAndAllergies: formData.get("conditionsAndAllergies") ?? undefined,
      medications: formData.get("medications") ?? undefined,
      doctorName: formData.get("doctorName") ?? undefined,
      doctorPhone: formData.get("doctorPhone") ?? undefined,
      immunizationStatus: formData.get("immunizationStatus"),
      mediaRelease: formData.get("mediaRelease"),
      notes: formData.get("notes") ?? undefined,
    });
    if (!parsed.success) return fromZodError(parsed.error);

    const d = parsed.data;
    // Capability AND scope, derived from the stored user record — not from this form.
    const user = await requireStudentAccess(d.studentId, "write");

    const students = await studentsCollection();
    const existing = await students.findOne({ _id: new ObjectId(d.studentId) });
    if (!existing) return failure("That student record no longer exists.");

    /**
     * A departure date is set when the student stops being enrolled, and cleared if they
     * return. It starts the seven-year retention clock in Document 6 §6.1, so it is derived
     * from status rather than left to be remembered.
     */
    const departedAt =
      d.status === "enrolled"
        ? null
        : (existing.departedAt ?? new Date());

    try {
      await students.updateOne(
        { _id: existing._id },
        {
          $set: {
            legalName: d.legalName,
            dateOfBirth: d.dateOfBirth,
            gradeLevel: d.gradeLevel,
            cohort: d.cohort,
            enrollmentStartDate: d.enrollmentStartDate,
            status: d.status,
            schoolId: d.schoolId ?? null,
            departedAt,
            guardian: {
              name: d.guardianName,
              email: d.guardianEmail,
              phone: d.guardianPhone,
              address: d.guardianAddress,
              emergencyContactName: d.emergencyContactName,
              emergencyContactPhone: d.emergencyContactPhone,
            },
            medical: {
              conditionsAndAllergies: d.conditionsAndAllergies,
              medications: d.medications,
              doctorName: d.doctorName,
              doctorPhone: d.doctorPhone,
              immunizationStatus: d.immunizationStatus,
            },
            mediaRelease: d.mediaRelease,
            notes: d.notes,
            updatedAt: new Date(),
          },
        },
      );
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        return failure(
          `School ID "${d.schoolId}" is already assigned to another student.`,
        );
      }
      throw error;
    }

    /**
     * Audit the field NAMES that changed, never the values. The audit log is queried and
     * exported more freely than the records themselves, so putting a medical note or an
     * address in here would quietly widen its exposure.
     */
    const changed: string[] = [];
    if (existing.legalName !== d.legalName) changed.push("legalName");
    if (existing.gradeLevel !== d.gradeLevel) changed.push("gradeLevel");
    if (existing.cohort !== d.cohort) changed.push("cohort");
    if (existing.status !== d.status) changed.push("status");
    if ((existing.schoolId ?? null) !== (d.schoolId ?? null)) changed.push("schoolId");
    if (existing.dateOfBirth.getTime() !== d.dateOfBirth.getTime()) {
      changed.push("dateOfBirth");
    }

    await logAudit({
      actor: user,
      action: "student.update",
      subjectId: existing._id,
      subjectType: "student",
      meta: { fields: changed.join(",") || "contact/medical only" },
    });

    revalidatePath(`/admin/students/${d.studentId}`);
    revalidatePath("/admin/students");

    // A changed name or date of birth changes what the generated address WOULD be. Say so
    // rather than silently reissuing — an address already live in Office 365 must not be
    // rewritten by a typo correction.
    const suggested = buildSchoolEmailLocalPart({
      legalName: d.legalName,
      dateOfBirth: d.dateOfBirth,
    });
    const currentLocal = existing.schoolEmail?.split("@")[0] ?? null;
    const emailNowStale =
      suggested !== null && currentLocal !== null && suggested !== currentLocal;

    return success(
      undefined,
      emailNowStale
        ? `Saved. Note the school email no longer matches the naming pattern for this name and date of birth — regenerate it below if that is intended.`
        : "Student record saved.",
    );
  });
}

/* ------------------------------- school email ------------------------------- */

const schoolEmailSchema = z.object({
  studentId: objectId,
  /** Blank means "regenerate from the naming pattern". */
  schoolEmail: optional(320),
  status: z.enum(SCHOOL_EMAIL_STATUSES, { error: "Choose an email status" }),
});

/**
 * Sets or regenerates a student's school email address and its lifecycle status.
 *
 * The address is only a record of intent until an Office 365 mailbox exists behind it,
 * which is what `pending` means. An administrator flips it to `active` once the mailbox is
 * confirmed working — nothing in the system sends mail to a pending address.
 */
export async function updateSchoolEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction(async () => {
    // Assigning school identities is an administrator's job, not an instructor's.
    await requireCapability("records:write");

    const parsed = schoolEmailSchema.safeParse({
      studentId: formData.get("studentId"),
      schoolEmail: formData.get("schoolEmail") ?? undefined,
      status: formData.get("status"),
    });
    if (!parsed.success) return fromZodError(parsed.error);

    const { studentId, status } = parsed.data;
    const user = await requireStudentAccess(studentId, "write");

    const students = await studentsCollection();
    const student = await students.findOne({ _id: new ObjectId(studentId) });
    if (!student) return failure("That student record no longer exists.");

    let address = parsed.data.schoolEmail?.toLowerCase() ?? null;
    let collided = false;

    if (!address) {
      // Regenerate from the pattern.
      const base = buildSchoolEmailLocalPart({
        legalName: student.legalName,
        dateOfBirth: student.dateOfBirth,
      });
      if (!base) {
        return failure(
          "Could not build an address from this student's name and date of birth — enter one manually.",
        );
      }
      const others = await students
        .find(
          { _id: { $ne: student._id }, schoolEmail: { $ne: null } },
          { projection: { schoolEmail: 1 } },
        )
        .toArray();
      const resolved = resolveCollision(
        base,
        others.map((s) => s.schoolEmail ?? "").filter(Boolean),
      );
      collided = resolved.collided;
      address = `${resolved.localPart}@${SCHOOL_EMAIL_DOMAIN}`;
    } else if (!isPlausibleSchoolEmail(address)) {
      return failure("That does not look like a valid email address.");
    }

    try {
      await students.updateOne(
        { _id: student._id },
        {
          $set: {
            schoolEmail: address,
            schoolEmailStatus: status,
            schoolEmailActivatedAt:
              status === "active"
                ? (student.schoolEmailActivatedAt ?? new Date())
                : null,
            updatedAt: new Date(),
          },
        },
      );
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        return failure(
          `${address} is already assigned to another student. Regenerate to get a numbered variant.`,
        );
      }
      throw error;
    }

    await logAudit({
      actor: user,
      action: "student.update",
      subjectId: student._id,
      subjectType: "student",
      meta: { fields: "schoolEmail", emailStatus: status },
    });

    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath("/admin/students");

    return success(
      undefined,
      collided
        ? `Saved as ${address} — the plain pattern was already taken by another student, so a numbered variant was issued.`
        : status === "pending"
          ? `Saved as ${address}, marked pending. Create the Office 365 mailbox, then set it to active.`
          : `Saved as ${address} (${status}).`,
    );
  });
}
