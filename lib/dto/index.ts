import "server-only";
import type {
  EnrollmentApplicationDoc,
  StudentDoc,
  AttendanceRecordDoc,
  MasteryLogDoc,
  BehaviorRecordDoc,
  TaekwondoRankDoc,
} from "../db/types";
import type { AuthenticatedUser } from "../dal";
import { can } from "../auth/roles";

/**
 * DATA TRANSFER OBJECTS
 * =============================================================================
 * Shapes a database document into exactly what a view needs, and nothing more.
 *
 * WHY THIS LAYER EXISTS
 * Returning a raw Mongo document to a component is how fields leak. `_id` becomes a
 * string in the RSC payload, `passwordHash` rides along on a user object someone
 * spread, and a medical note ends up in the HTML of a page that only meant to show a
 * name. Every one of those is a single careless `...doc` away.
 *
 * So: views receive DTOs. The rule is that a DTO never contains a field the view does
 * not render.
 *
 * The medical DTO additionally takes the caller's role, because "who may see medical
 * detail" is a policy decision that belongs next to the shaping code rather than
 * scattered across templates.
 */

function id(value: { toString(): string } | undefined | null): string {
  return value ? value.toString() : "";
}

/** ISO date (YYYY-MM-DD). Dates cross to the client as strings, never as Date. */
function isoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/* ------------------------------- Applications ------------------------------ */

export interface ApplicationListItem {
  id: string;
  studentLegalName: string;
  gradeLevel: string;
  requestedCohort: string | null;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  status: string;
  submittedAt: string;
  emailStatus: string;
  promoted: boolean;
}

/**
 * List row. Deliberately carries NO medical fields, NO date of birth, and NO signature
 * detail — a list view has no business loading them, and a screenshot of the inbox
 * should not expose a child's health history.
 */
export function toApplicationListItem(
  doc: EnrollmentApplicationDoc,
): ApplicationListItem {
  return {
    id: id(doc._id),
    studentLegalName: doc.studentLegalName,
    gradeLevel: doc.gradeLevel,
    requestedCohort: doc.requestedCohort ?? null,
    guardianName: doc.guardian.name,
    guardianEmail: doc.guardian.email,
    guardianPhone: doc.guardian.phone,
    status: doc.status,
    submittedAt: doc.submittedAt.toISOString(),
    emailStatus: doc.emailStatus,
    promoted: Boolean(doc.promotedStudentId),
  };
}

export interface ApplicationDetail extends ApplicationListItem {
  dateOfBirth: string | null;
  enrollmentStartDate: string | null;
  guardianAddress: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  esaElection: string;
  acknowledgments: Record<string, boolean>;
  mediaRelease: string;
  /** Present only when the caller's role may read medical detail. */
  medical: {
    conditionsAndAllergies: string | null;
    medications: string | null;
    doctorName: string | null;
    doctorPhone: string | null;
    immunizationStatus: string;
  } | null;
  signature: {
    typedName: string;
    intentAffirmed: boolean;
    signedAt: string;
    ip: string | null;
    userAgent: string | null;
    agreementHash: string;
    consentVersion: string;
  };
  countersigned: {
    typedName: string;
    signedAt: string;
  } | null;
  reviewNotes: string | null;
}

export function toApplicationDetail(
  doc: EnrollmentApplicationDoc,
  viewer: AuthenticatedUser,
): ApplicationDetail {
  // Only roles with full record access see medical detail. An instructor reviewing an
  // application to prepare for an intake meeting does not need a child's medications.
  const mayReadMedical = can(viewer.role, "records:read:all");

  return {
    ...toApplicationListItem(doc),
    dateOfBirth: isoDate(doc.dateOfBirth),
    enrollmentStartDate: isoDate(doc.enrollmentStartDate),
    guardianAddress: doc.guardian.address,
    emergencyContactName: doc.guardian.emergencyContactName ?? null,
    emergencyContactPhone: doc.guardian.emergencyContactPhone ?? null,
    esaElection: doc.esaElection,
    acknowledgments: doc.acknowledgments,
    mediaRelease: doc.mediaRelease,
    medical: mayReadMedical
      ? {
          conditionsAndAllergies: doc.medical.conditionsAndAllergies ?? null,
          medications: doc.medical.medications ?? null,
          doctorName: doc.medical.doctorName ?? null,
          doctorPhone: doc.medical.doctorPhone ?? null,
          immunizationStatus: doc.medical.immunizationStatus,
        }
      : null,
    signature: {
      typedName: doc.guardianSignature.typedName,
      intentAffirmed: doc.guardianSignature.intentAffirmed,
      signedAt: doc.guardianSignature.signedAt.toISOString(),
      ip: doc.guardianSignature.ip ?? null,
      userAgent: doc.guardianSignature.userAgent ?? null,
      agreementHash: doc.guardianSignature.agreementHash,
      consentVersion: doc.guardianSignature.consentVersion,
    },
    countersigned: doc.headOfSchoolSignature
      ? {
          typedName: doc.headOfSchoolSignature.typedName,
          signedAt: doc.headOfSchoolSignature.signedAt.toISOString(),
        }
      : null,
    reviewNotes: doc.reviewNotes ?? null,
  };
}

/* --------------------------------- Students -------------------------------- */

export interface StudentListItem {
  id: string;
  legalName: string;
  gradeLevel: string;
  cohort: string;
  status: string;
  enrollmentStartDate: string | null;
}

export function toStudentListItem(doc: StudentDoc): StudentListItem {
  return {
    id: id(doc._id),
    legalName: doc.legalName,
    gradeLevel: doc.gradeLevel,
    cohort: doc.cohort,
    status: doc.status,
    enrollmentStartDate: isoDate(doc.enrollmentStartDate),
  };
}

export interface StudentDetail extends StudentListItem {
  dateOfBirth: string | null;
  guardian: {
    name: string;
    email: string;
    phone: string;
    address: string;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
  };
  mediaRelease: string;
  /** Null when the caller may not read medical detail. */
  medical: {
    conditionsAndAllergies: string | null;
    medications: string | null;
    doctorName: string | null;
    doctorPhone: string | null;
    immunizationStatus: string;
  } | null;
  applicationId: string | null;
}

export function toStudentDetail(
  doc: StudentDoc,
  viewer: AuthenticatedUser,
): StudentDetail {
  // Guardians see their own child's medical record; instructors with assigned-student
  // access see it too, since staff supervising a child with a peanut allergy need to
  // know. Only a role with no record access at all is excluded.
  const mayReadMedical =
    can(viewer.role, "records:read:all") ||
    can(viewer.role, "records:read:assigned") ||
    can(viewer.role, "records:read:own-children");

  return {
    ...toStudentListItem(doc),
    dateOfBirth: isoDate(doc.dateOfBirth),
    guardian: {
      name: doc.guardian.name,
      email: doc.guardian.email,
      phone: doc.guardian.phone,
      address: doc.guardian.address,
      emergencyContactName: doc.guardian.emergencyContactName ?? null,
      emergencyContactPhone: doc.guardian.emergencyContactPhone ?? null,
    },
    mediaRelease: doc.mediaRelease,
    medical: mayReadMedical
      ? {
          conditionsAndAllergies: doc.medical.conditionsAndAllergies ?? null,
          medications: doc.medical.medications ?? null,
          doctorName: doc.medical.doctorName ?? null,
          doctorPhone: doc.medical.doctorPhone ?? null,
          immunizationStatus: doc.medical.immunizationStatus,
        }
      : null,
    applicationId: doc.applicationId ? id(doc.applicationId) : null,
  };
}

/* ---------------------------------- Records -------------------------------- */

export interface AttendanceItem {
  id: string;
  studentId: string;
  date: string;
  code: string;
  notes: string | null;
}

export function toAttendanceItem(doc: AttendanceRecordDoc): AttendanceItem {
  return {
    id: id(doc._id),
    studentId: id(doc.studentId),
    date: doc.date,
    code: doc.code,
    notes: doc.notes ?? null,
  };
}

export interface MasteryItem {
  id: string;
  subject: string;
  skill: string;
  dateMastered: string | null;
  assessmentMethod: string;
  inferred: boolean;
  notes: string | null;
  schoolYear: string;
}

export function toMasteryItem(doc: MasteryLogDoc): MasteryItem {
  return {
    id: id(doc._id),
    subject: doc.subject,
    skill: doc.skill,
    dateMastered: isoDate(doc.dateMastered),
    assessmentMethod: doc.assessmentMethod,
    // Surfaced so a reviewer can tell a directly-assessed skill from one credited via
    // hierarchical competency (Document 3 §3.5).
    inferred: Boolean(doc.inferredFromMasteryId),
    notes: doc.notes ?? null,
    schoolYear: doc.schoolYear,
  };
}

export interface BehaviorItem {
  id: string;
  period: string;
  pillar: string;
  targetBehavior: string;
  level: number;
  notes: string | null;
}

export function toBehaviorItem(doc: BehaviorRecordDoc): BehaviorItem {
  return {
    id: id(doc._id),
    period: doc.period,
    pillar: doc.pillar,
    targetBehavior: doc.targetBehavior,
    level: doc.level,
    notes: doc.notes ?? null,
  };
}

export interface TaekwondoItem {
  id: string;
  rank: string;
  requirementsDemonstrated: string;
  assessmentDate: string | null;
  assessedBy: string;
}

export function toTaekwondoItem(doc: TaekwondoRankDoc): TaekwondoItem {
  return {
    id: id(doc._id),
    rank: doc.rank,
    requirementsDemonstrated: doc.requirementsDemonstrated,
    assessmentDate: isoDate(doc.assessmentDate),
    assessedBy: doc.assessedBy,
  };
}
