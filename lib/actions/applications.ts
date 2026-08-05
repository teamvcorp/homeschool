"use server";

import { z } from "zod";
import { ObjectId, MongoServerError } from "mongodb";
import { revalidatePath } from "next/cache";
import { applicationsCollection, studentsCollection } from "../db/collections";
import {
  APPLICATION_TRANSITIONS,
  APPLICATION_STATUSES,
} from "../db/enums";
import type { StudentDoc } from "../db/types";
import { requireCapability } from "../dal";
import { logAudit } from "../audit";
import { agreementHash, CONSENT_VERSION } from "../enrollment/agreement";
import {
  buildSchoolEmailLocalPart,
  resolveCollision,
  SCHOOL_EMAIL_DOMAIN,
} from "../school-email";
import { type ActionState, guardAction, failure, success, fromZodError } from "./types";

/**
 * APPLICATION REVIEW ACTIONS
 * =============================================================================
 * Everything an administrator does to an incoming application: move it through the
 * status machine, countersign it, and promote it into a real student record.
 *
 * EVERY ACTION HERE STARTS WITH requireCapability(). Before parsing input, before
 * touching the database. Server Actions are POSTed to the route they are used on and
 * are reachable by direct request, so the proxy's redirect provides no protection at
 * all — this is the only thing standing between an anonymous POST and a student record.
 */

const objectId = z
  .string()
  .refine((v) => ObjectId.isValid(v), "Invalid record id");

/* ----------------------------- status transition ---------------------------- */

const transitionSchema = z.object({
  applicationId: objectId,
  status: z.enum(APPLICATION_STATUSES),
  notes: z.string().trim().max(4000).optional(),
});

/**
 * Advances an application's status.
 *
 * The transition is validated against APPLICATION_TRANSITIONS *server-side*, using the
 * application's current stored status. The UI only offers legal next steps, but a
 * crafted POST could name any status at all — so the check happens here, and the
 * comparison is against the database rather than anything the client supplied.
 */
export async function transitionApplicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction(async () => {
    const user = await requireCapability("applications:decide");

    const parsed = transitionSchema.safeParse({
      applicationId: formData.get("applicationId"),
      status: formData.get("status"),
      notes: formData.get("notes") ?? undefined,
    });
    if (!parsed.success) return fromZodError(parsed.error);

    const { applicationId, status, notes } = parsed.data;
    const applications = await applicationsCollection();
    const application = await applications.findOne({
      _id: new ObjectId(applicationId),
    });
    if (!application) return failure("That application no longer exists.");

    const allowed = APPLICATION_TRANSITIONS[application.status];
    if (!allowed.includes(status)) {
      return failure(
        `An application at "${application.status}" cannot move to "${status}".`,
      );
    }

    await applications.updateOne(
      { _id: application._id },
      {
        $set: {
          status,
          ...(notes ? { reviewNotes: notes } : {}),
          updatedAt: new Date(),
        },
      },
    );

    await logAudit({
      actor: user,
      action: "application.statusChange",
      subjectId: application._id,
      subjectType: "application",
      meta: { from: application.status, to: status },
    });

    revalidatePath("/admin/applications");
    revalidatePath(`/admin/applications/${applicationId}`);
    return success(undefined, `Status updated to ${status}.`);
  });
}

/* -------------------------------- countersign ------------------------------- */

const countersignSchema = z.object({
  applicationId: objectId,
  typedName: z.string().trim().min(1, "Type your name to countersign").max(200),
  intentAffirmed: z.literal(true, {
    error: "Confirm your intent to countersign",
  }),
});

/**
 * Head of School countersignature — the school's half of Document 9 §9.7.
 *
 * Records the same evidence envelope as the family's signature (intent, timestamp,
 * agreement hash, consent version), because a one-sided evidence trail is a weak one.
 */
export async function countersignApplicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction(async () => {
    const user = await requireCapability("applications:decide");

    const parsed = countersignSchema.safeParse({
      applicationId: formData.get("applicationId"),
      typedName: formData.get("typedName"),
      intentAffirmed: formData.get("intentAffirmed") === "true",
    });
    if (!parsed.success) return fromZodError(parsed.error);

    const { applicationId, typedName } = parsed.data;
    const applications = await applicationsCollection();

    const result = await applications.updateOne(
      // The null guard makes this idempotent: a double-submit cannot overwrite an
      // existing countersignature with a later timestamp.
      { _id: new ObjectId(applicationId), headOfSchoolSignature: null },
      {
        $set: {
          headOfSchoolSignature: {
            typedName,
            intentAffirmed: true,
            signedAt: new Date(),
            agreementHash: agreementHash(),
            consentVersion: CONSENT_VERSION,
          },
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return failure(
        "That application either no longer exists or has already been countersigned.",
      );
    }

    await logAudit({
      actor: user,
      action: "application.countersign",
      subjectId: new ObjectId(applicationId),
      subjectType: "application",
    });

    revalidatePath(`/admin/applications/${applicationId}`);
    return success(undefined, "Agreement countersigned.");
  });
}

/* ---------------------------------- promote --------------------------------- */

const promoteSchema = z.object({
  applicationId: objectId,
  cohort: z.enum(["early", "middle", "upper", "higher-institute"], {
    error: "Choose the cohort this student is placed in",
  }),
  gradeLevel: z.string().trim().min(1, "Confirm the grade level").max(40),
});

/**
 * Promotes an accepted application into a trusted student record.
 *
 * THIS IS THE TRUST BOUNDARY OF THE WHOLE SYSTEM.
 *
 * Everything in `enrollmentApplications` arrived from an anonymous internet POST. The
 * `students` collection is what the school operates from and what an Iowa DE reviewer
 * inspects. This function is the only path between them, and it requires an
 * authenticated administrator, a legal status transition, and an explicit confirmation
 * of cohort and grade placement — the two fields a family only *requested*.
 *
 * Guarded against double-promotion by requiring `promotedStudentId: null` in the
 * filter, so a double-clicked button cannot create two student records for one child.
 */
export async function promoteApplicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction(async () => {
    const user = await requireCapability("applications:decide");

    const parsed = promoteSchema.safeParse({
      applicationId: formData.get("applicationId"),
      cohort: formData.get("cohort"),
      gradeLevel: formData.get("gradeLevel"),
    });
    if (!parsed.success) return fromZodError(parsed.error);

    const { applicationId, cohort, gradeLevel } = parsed.data;
    const applications = await applicationsCollection();
    const students = await studentsCollection();

    const application = await applications.findOne({
      _id: new ObjectId(applicationId),
    });
    if (!application) return failure("That application no longer exists.");
    if (application.promotedStudentId) {
      return failure("This application has already been promoted to a student record.");
    }

    /**
     * `accepted` is the normal precondition. `enrolled` is accepted too, as a RECOVERY
     * path: before `accepted → enrolled` was removed from the status dropdown, an
     * administrator could set that status manually, which created no student record and
     * then hid the promote form — leaving the application permanently stuck. Allowing
     * promotion from `enrolled`-without-a-student rescues any record already in that state.
     */
    const promotable =
      application.status === "accepted" || application.status === "enrolled";
    if (!promotable) {
      return failure(
        `Only an accepted application can be promoted. This one is "${application.status}".`,
      );
    }

    const now = new Date();

    /**
     * Issue the school email address now, as pending.
     *
     * Generated from the student's name and date of birth
     * ({firstName}{DD}{lastInitial}{YY}@vaschool.org) and checked against every address
     * already issued, because the format encodes no month and so genuinely collides for two
     * students sharing a given name, birth day, birth year, and surname initial.
     *
     * Recorded as `pending`: the address exists in our records but there is no Office 365
     * mailbox behind it until someone creates one, so nothing may send mail to it yet.
     */
    const baseLocal = buildSchoolEmailLocalPart({
      legalName: application.studentLegalName,
      dateOfBirth: application.dateOfBirth,
    });

    let schoolEmail: string | null = null;
    if (baseLocal) {
      const existing = await students
        .find(
          { schoolEmail: { $ne: null } },
          { projection: { schoolEmail: 1 } },
        )
        .toArray();
      const { localPart } = resolveCollision(
        baseLocal,
        existing.map((s) => s.schoolEmail ?? "").filter(Boolean),
      );
      schoolEmail = `${localPart}@${SCHOOL_EMAIL_DOMAIN}`;
    }

    const student: StudentDoc = {
      legalName: application.studentLegalName,
      dateOfBirth: application.dateOfBirth,
      // Confirmed by staff, not taken from the family's request.
      gradeLevel,
      cohort,
      enrollmentStartDate: application.enrollmentStartDate,
      status: "enrolled",
      schoolId: null,
      schoolEmail,
      schoolEmailStatus: "pending",
      schoolEmailActivatedAt: null,
      guardian: application.guardian,
      medical: application.medical,
      mediaRelease: application.mediaRelease,
      applicationId: application._id,
      departedAt: null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };

    let studentId: ObjectId;
    try {
      const inserted = await students.insertOne(student);
      studentId = inserted.insertedId;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        return failure("A student record for this application already exists.");
      }
      throw error;
    }

    const linked = await applications.updateOne(
      { _id: application._id, promotedStudentId: null },
      {
        $set: { promotedStudentId: studentId, status: "enrolled", updatedAt: new Date() },
      },
    );

    // Lost a race with a concurrent promotion: roll back the student we just created
    // rather than leaving an orphan record the school would have to notice manually.
    if (linked.matchedCount === 0) {
      await students.deleteOne({ _id: studentId });
      return failure("This application was promoted by someone else a moment ago.");
    }

    await logAudit({
      actor: user,
      action: "application.promote",
      subjectId: studentId,
      subjectType: "student",
      meta: { applicationId, cohort, gradeLevel },
    });

    revalidatePath("/admin/applications");
    revalidatePath("/admin/students");
    return success(undefined, `${student.legalName} is now an enrolled student.`);
  });
}
