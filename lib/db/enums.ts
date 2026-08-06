/**
 * CLOSED VOCABULARIES
 * =============================================================================
 * Every enumerated value the database stores. Kept separate from lib/db/types.ts
 * so validation schemas, UI components, and document types all draw the allowed
 * values from one place — and so a typo in a status string is a compile error
 * rather than a record that silently never matches a query.
 *
 * These deliberately mirror the vocabularies in lib/site.ts (cohorts, attendance
 * codes, belt ranks, pathways). site.ts owns the *presentation* copy; this file
 * owns the *stored* value. They are the same strings on purpose.
 */

/* ---------------------------------- Roles --------------------------------- */

export const ROLES = ["admin", "instructor", "parent"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Capability model. Checked by lib/auth/roles.ts rather than comparing role
 * strings at call sites — so adding a role later means editing this table, not
 * hunting every `role === "admin"` in the codebase.
 */
export const CAPABILITIES = [
  "records:read:all",
  "records:read:assigned",
  "records:read:own-children",
  "records:write",
  "applications:read",
  "applications:decide",
  "instructors:manage",
  "partnerships:manage",
  "users:manage",
  "financials:read",
  "audit:read",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const ROLE_CAPABILITIES: Record<Role, readonly Capability[]> = {
  /** Head of School — full access. */
  admin: [...CAPABILITIES],
  /**
   * Instructors record progress for students in their scope. Deliberately no
   * financials, no user management, no application decisions.
   */
  instructor: ["records:read:assigned", "records:write", "applications:read"],
  /** Families see their own children's records, read-only. */
  parent: ["records:read:own-children"],
};

/* -------------------------------- Cohorts --------------------------------- */

export const COHORT_IDS = ["early", "middle", "upper", "higher-institute"] as const;
export type CohortId = (typeof COHORT_IDS)[number];

/* ------------------------------- Attendance ------------------------------- */

/** Document 6, Template A. */
export const ATTENDANCE_CODES = ["P", "A", "E", "T"] as const;
export type AttendanceCode = (typeof ATTENDANCE_CODES)[number];

/* --------------------------- Behavior assessment -------------------------- */

export const BEHAVIOR_PILLAR_IDS = [
  "self-control",
  "self-awareness",
  "strength-of-character",
] as const;
export type BehaviorPillarId = (typeof BEHAVIOR_PILLAR_IDS)[number];

/**
 * Document 6, Template C — the five-point generalization scale.
 * 1 = not yet observed … 5 = generalized across environments.
 */
export const GENERALIZATION_LEVELS = [1, 2, 3, 4, 5] as const;
export type GeneralizationLevel = (typeof GENERALIZATION_LEVELS)[number];

/* --------------------------------- Subjects -------------------------------- */

/** Document 6, Template B. */
export const SUBJECTS = [
  "Mathematics",
  "Science",
  "English Language Arts",
  "Social Studies",
  "Computer Science & Coding",
  "Leadership Development",
  "Taekwondo",
  "Clinical Mental Health Literacy",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const ASSESSMENT_METHODS = [
  "written",
  "oral",
  "applied",
  "group demonstration",
  "task analysis",
] as const;
export type AssessmentMethod = (typeof ASSESSMENT_METHODS)[number];

/* -------------------------------- Taekwondo -------------------------------- */

/** Document 6, Template D. */
export const BELT_RANKS = [
  "White Belt",
  "Yellow Belt",
  "Green Belt",
  "Blue Belt",
  "Red Belt",
  "Black Belt",
] as const;
export type BeltRank = (typeof BELT_RANKS)[number];

/* ------------------------------- Enrollment -------------------------------- */

/**
 * Application lifecycle. A public submission enters at `submitted` and is only
 * promoted into a trusted student record at `enrolled`.
 *
 * Terminal states: declined, withdrawn.
 */
export const APPLICATION_STATUSES = [
  "submitted",
  "intakeScheduled",
  "assessed",
  "accepted",
  "enrolled",
  "declined",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/**
 * Which forward transitions an administrator may select from the status dropdown.
 * Enforced server-side against the STORED status, not the submitted one.
 *
 * ⚠️  NOTE `accepted` CANNOT go to `enrolled` here, and that omission is deliberate.
 *
 * `enrolled` means "a student record exists". It is a CONSEQUENCE of promotion, not a label
 * someone chooses — so only promoteApplicationAction may set it, and it does so itself.
 *
 * This was a real production trap: `accepted → enrolled` used to be selectable, an
 * administrator picked it expecting a student record to appear, no record was created
 * (only promotion does that), and because the promote form only rendered while the status
 * was `accepted`, choosing `enrolled` made the form vanish and left the application
 * permanently unable to produce a student. Removing the transition closes the trap; the
 * promote action additionally accepts a stuck `enrolled`-without-a-student record so any
 * application already in that state can still be recovered.
 */
export const APPLICATION_TRANSITIONS: Record<
  ApplicationStatus,
  readonly ApplicationStatus[]
> = {
  submitted: ["intakeScheduled", "declined", "withdrawn"],
  intakeScheduled: ["assessed", "declined", "withdrawn"],
  assessed: ["accepted", "declined", "withdrawn"],
  // No "enrolled" — use the promote action, which creates the student record.
  accepted: ["declined", "withdrawn"],
  enrolled: ["withdrawn"],
  declined: [],
  withdrawn: [],
};

/** Document 9 §9.3 — mutually exclusive, so a radio group rather than checkboxes. */
export const ESA_ELECTIONS = [
  "intendsToApply",
  "payingDirectly",
  "requestingHardship",
] as const;
export type EsaElection = (typeof ESA_ELECTIONS)[number];

/** Document 9 §9.5 — Iowa law admits no third state. */
export const IMMUNIZATION_STATUSES = ["recordsOnFile", "exemptionOnFile"] as const;
export type ImmunizationStatus = (typeof IMMUNIZATION_STATUSES)[number];

/**
 * Document 9 §9.6 — an explicit binary, never a single opt-in checkbox.
 * There is no default: the guardian must actively choose, and an absent choice is
 * treated as no consent.
 */
export const MEDIA_RELEASE_CHOICES = ["consent", "noConsent"] as const;
export type MediaReleaseChoice = (typeof MEDIA_RELEASE_CHOICES)[number];

/**
 * The eight Program Acknowledgments from Document 9 §9.4. Every one must be
 * affirmatively true to submit. Stored as keys so a later wording change does not
 * orphan historical consent records — the `consentVersion` on the application
 * says which wording the family actually saw.
 */
export const ACKNOWLEDGMENT_KEYS = [
  "masteryProgression",
  "taekwondoRequired",
  "graduationEarned",
  "attendanceCommitment",
  "behavioralFramework",
  "monthlyContribution",
  "activityConsent",
  "recordsConfidentiality",
] as const;
export type AcknowledgmentKey = (typeof ACKNOWLEDGMENT_KEYS)[number];

/**
 * Version stamp for the acknowledgment and agreement wording. Bump this whenever
 * the legal text in the enrollment agreement changes, so a signature record
 * always identifies exactly what was agreed to.
 */
export const CONSENT_VERSION = "2026-08-01";

/* ------------------------------- Students ---------------------------------- */

export const STUDENT_STATUSES = [
  "enrolled",
  "graduated",
  "withdrawn",
  "archived",
] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

/**
 * Lifecycle of a student's school email address on vaschool.org.
 *
 * `pending` is the DEFAULT and the important one: the address is generated and recorded as
 * soon as a student is enrolled, but it does not exist in Office 365 until someone creates
 * the mailbox. Until then it must never be treated as deliverable — no automated mail is
 * sent to a pending address, and the admin UI shows it as not-yet-live.
 *
 * `active` is set by an administrator once the Office 365 mailbox is confirmed working.
 * `disabled` covers a departed student whose mailbox has been closed.
 */
export const SCHOOL_EMAIL_STATUSES = ["pending", "active", "disabled"] as const;
export type SchoolEmailStatus = (typeof SCHOOL_EMAIL_STATUSES)[number];

/* ------------------------------ Partnerships ------------------------------- */

export const CAREER_PATHWAY_IDS = [
  "pre-medicine",
  "technology",
  "mechanical",
  "skilled-trades",
] as const;
export type CareerPathwayId = (typeof CAREER_PATHWAY_IDS)[number];

export const PARTNERSHIP_STATUSES = [
  "draft",
  "active",
  "completed",
  "terminated",
] as const;
export type PartnershipStatus = (typeof PARTNERSHIP_STATUSES)[number];

export const COMPENSATION_TYPES = ["unpaid", "hourly", "other"] as const;
export type CompensationType = (typeof COMPENSATION_TYPES)[number];

/* -------------------------------- Inquiries -------------------------------- */

export const INQUIRY_TYPES = [
  "tour",
  "general",
  "instructor",
  "volunteer",
  "employerPartnership",
] as const;
export type InquiryType = (typeof INQUIRY_TYPES)[number];

export const INQUIRY_STATUSES = ["new", "contacted", "closed"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

/* ---------------------------------- Email ---------------------------------- */

export const EMAIL_STATUSES = ["queued", "sent", "failed"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

/* ---------------------------------- Audit ---------------------------------- */

/**
 * Audited actions. FERPA-relevant reads are audited as well as writes — knowing
 * who *looked at* a student's behavioral record matters as much as who changed it.
 */
export const AUDIT_ACTIONS = [
  "auth.login",
  "auth.loginFailed",
  "auth.logout",
  "student.read",
  "student.create",
  "student.update",
  "student.archive",
  "attendance.record",
  "mastery.record",
  "behavior.record",
  "taekwondo.record",
  "application.read",
  "application.statusChange",
  "application.promote",
  "application.countersign",
  /**
   * A status-update email was sent to the family (or queued when the send failed).
   *
   * Audited because it is an outbound communication to a family about a decision. When a
   * parent later says "nobody told us", the answer has to be a record, not a memory —
   * and because sends are idempotent, the absence of this entry is itself meaningful.
   */
  "application.notifyFamily",
  /** The enrolled-student welcome email, sent when the school mailbox went live. */
  "student.notifyWelcome",
  "document.download",
  "instructor.update",
  "partnership.update",
  "user.create",
  "user.update",
  /**
   * A user changed their own password.
   *
   * Audited because it is the event that separates "this account was used by its owner" from
   * "this account was taken over". Every existing session is revoked at the same moment, so
   * this entry is also the explanation for every other device being signed out.
   */
  "auth.passwordChanged",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
