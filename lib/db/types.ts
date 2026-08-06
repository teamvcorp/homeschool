import type { ObjectId } from "mongodb";
import type { Locale } from "../i18n/locales";
import type {
  Role,
  CohortId,
  AttendanceCode,
  BehaviorPillarId,
  GeneralizationLevel,
  Subject,
  AssessmentMethod,
  BeltRank,
  ApplicationStatus,
  EsaElection,
  ImmunizationStatus,
  MediaReleaseChoice,
  AcknowledgmentKey,
  StudentStatus,
  SchoolEmailStatus,
  CareerPathwayId,
  PartnershipStatus,
  CompensationType,
  InquiryType,
  InquiryStatus,
  EmailStatus,
  AuditAction,
} from "./enums";

/**
 * DOCUMENT SHAPES
 * =============================================================================
 * TypeScript interfaces for every collection. See docs/data-dictionary.md for the
 * mapping from each field back to the accreditation package document that
 * specifies it.
 *
 * CONVENTIONS
 *  - Dates are stored as native BSON Date, never as strings. String dates sort
 *    lexicographically, which breaks the moment a format changes.
 *  - EXCEPT `AttendanceRecord.date`, which is a "YYYY-MM-DD" *calendar day*
 *    string. Attendance is a school-day fact, not an instant; storing a Date
 *    would make it timezone-dependent and let one absence land on two days.
 *  - Soft delete only: `archivedAt` instead of deleteOne. Document 6 §6.1
 *    requires a seven-year retention period after a student departs.
 *  - Every mutable document carries createdAt/updatedAt.
 */

/** Fields shared by every stored document. */
interface Base {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  /** Soft-delete marker. Null/absent means active. */
  archivedAt?: Date | null;
}

/* ---------------------------------- Users ---------------------------------- */

export interface UserDoc extends Base {
  /** Lowercased and trimmed before storage. Unique index. */
  email: string;
  /** Argon2id hash. NEVER selected into anything that reaches a client. */
  passwordHash: string;
  name: string;
  role: Role;
  /** Disabled accounts cannot log in but are retained for audit history. */
  active: boolean;
  lastLoginAt?: Date | null;
  /**
   * Bumped to invalidate every existing session for this user — used on password
   * change, role change, and deactivation. The session token carries this value
   * and is rejected if it no longer matches.
   */
  sessionEpoch: number;
  /** For role="parent": the students this guardian may read. */
  studentIds?: ObjectId[];
  /** For role="instructor": the students in this instructor's scope. */
  assignedStudentIds?: ObjectId[];
}

/* --------------------------------- Students -------------------------------- */

export interface GuardianContact {
  name: string;
  email: string;
  phone: string;
  address: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

/**
 * Medical detail is the most sensitive data in the system. It is never included
 * in list queries, never emailed, never logged, and only ever shaped through
 * lib/dto before reaching a client.
 */
export interface MedicalInfo {
  conditionsAndAllergies?: string;
  medications?: string;
  doctorName?: string;
  doctorPhone?: string;
  immunizationStatus: ImmunizationStatus;
}

export interface StudentDoc extends Base {
  legalName: string;
  /** Stored as a Date; only the calendar date is meaningful. */
  dateOfBirth: Date;
  gradeLevel: string;
  cohort: CohortId;
  enrollmentStartDate: Date;
  status: StudentStatus;

  /**
   * The school's own identifier for this student, as used on paperwork and in the
   * K12/Stride platform. Administrator-assigned free text rather than generated, because
   * the school's numbering convention is theirs to decide. Unique when present.
   */
  schoolId?: string | null;

  /**
   * Issued address on vaschool.org, generated from name and date of birth by
   * lib/school-email.ts — {firstName}{DD}{lastInitial}{YY}, e.g. lily16v13@vaschool.org.
   *
   * Generated at promotion but NOT live until the Office 365 mailbox exists, which is what
   * `schoolEmailStatus` tracks. Nothing in the system may send mail to this address while
   * it is pending.
   */
  schoolEmail?: string | null;
  schoolEmailStatus?: SchoolEmailStatus;
  /** When an administrator confirmed the Office 365 mailbox was live. */
  schoolEmailActivatedAt?: Date | null;
  /**
   * When the family was sent the "you are enrolled" welcome message.
   *
   * The welcome email is deliberately NOT sent at promotion: the school email address is
   * generated there but the Office 365 mailbox does not exist yet, so telling a family
   * their address at that moment hands them something that bounces. It is sent when an
   * administrator flips the mailbox to `active`.
   *
   * Doubles as the idempotency guard — a second activation must not re-welcome them.
   */
  welcomeEmailSentAt?: Date | null;
  guardian: GuardianContact;
  medical: MedicalInfo;
  mediaRelease: MediaReleaseChoice;
  /** Links back to the application this student was promoted from. */
  applicationId?: ObjectId;
  /** Set when the student leaves; starts the seven-year retention clock. */
  departedAt?: Date | null;
  notes?: string;
}

/* ------------------------- Enrollment applications ------------------------- */

/**
 * Evidence retained for an electronic signature.
 *
 * Under the federal E-SIGN Act and Iowa UETA (Iowa Code ch. 554D), what makes a
 * signature valid is demonstrable INTENT TO SIGN plus ATTRIBUTION to the signer —
 * not a picture of handwriting. So we capture intent explicitly and record enough
 * context to attribute it later, including a hash of the exact agreement text the
 * signer was shown.
 */
export interface SignatureRecord {
  /** Typed legal name, exactly as entered. */
  typedName: string;
  /** The explicit "I intend to sign" affirmation. Must be true. */
  intentAffirmed: boolean;
  signedAt: Date;
  /** Best-effort client IP from proxy headers. */
  ip?: string;
  userAgent?: string;
  /** SHA-256 of the rendered agreement text, so we can prove what was signed. */
  agreementHash: string;
  /** Which wording version was displayed. */
  consentVersion: string;
  /**
   * The language the signer was READING when they signed.
   *
   * `agreementHash` always covers the ENGLISH text, because the English text is the
   * agreement — a translation is shown beneath it so the family understands what they
   * are signing, never as the instrument itself.
   *
   * Recording the display language therefore does not weaken the evidence, it
   * STRENGTHENS it: paired with the hash, the school can show both the exact terms and
   * the language in which they were presented. Absent on signatures predating
   * translation support, which were English by definition.
   */
  displayLanguage?: Locale;
}

export interface EnrollmentApplicationDoc extends Base {
  status: ApplicationStatus;

  // --- Student (Document 9 §9.1) ---
  studentLegalName: string;
  dateOfBirth: Date;
  gradeLevel: string;
  /** Suggested by the family; the school confirms at assessment. */
  requestedCohort?: CohortId;
  enrollmentStartDate: Date;

  // --- Guardian (§9.2) ---
  guardian: GuardianContact;

  // --- Funding (§9.3) ---
  esaElection: EsaElection;

  // --- Acknowledgments (§9.4) — all eight must be true to submit ---
  acknowledgments: Record<AcknowledgmentKey, boolean>;

  // --- Medical (§9.5) ---
  medical: MedicalInfo;

  // --- Media release (§9.6) ---
  mediaRelease: MediaReleaseChoice;

  // --- Signatures (§9.7) ---
  guardianSignature: SignatureRecord;
  /** Added later by the Head of School in the admin area. */
  headOfSchoolSignature?: SignatureRecord | null;

  // --- Submission metadata ---
  submittedAt: Date;
  submissionIp?: string;
  submissionUserAgent?: string;
  /** Derived from the draft; unique index makes a double-submit a no-op. */
  idempotencyKey: string;
  /** Set once promoted into a trusted student record. */
  promotedStudentId?: ObjectId | null;
  /** Internal notes; never shown to the family. */
  reviewNotes?: string;
  emailStatus: EmailStatus;

  /**
   * The language the family chose while applying. Status notifications are sent in it.
   *
   * Captured at submission from the language cookie. Absent means English — both for
   * applications predating this feature and for anyone who never touched the toggle.
   */
  preferredLanguage?: Locale;

  /**
   * Statuses the family has ALREADY been emailed about.
   *
   * The idempotency guard for notifications. Without it, an administrator who re-saves
   * the status form, or moves a status back and then forward again, emails the family
   * twice — and "congratulations, you're accepted" arriving three times reads as a
   * broken system at exactly the moment a family is deciding whether to trust the
   * school.
   *
   * Recorded per status rather than as a single timestamp so each milestone is tracked
   * independently.
   */
  familyNotifiedStatuses?: ApplicationStatus[];
}

/**
 * In-progress wizard state, keyed by a signed httpOnly cookie.
 *
 * Deliberately a separate collection from applications: a draft is untrusted,
 * incomplete, and disposable. A TTL index expires abandoned drafts, which also
 * means a half-entered medical history does not linger indefinitely.
 */
export interface EnrollmentDraftDoc {
  _id?: ObjectId;
  /** Random opaque id; the value in the signed cookie. */
  draftId: string;
  /**
   * Partial application data as RAW INPUT (the strings the family typed), not
   * post-validation output. Storing transformed values here once broke the final
   * whole-agreement re-validation — see the note in lib/actions/enrollment.ts.
   */
  data: Record<string, unknown>;
  /** Highest step the family has completed. */
  completedStep: number;

  /**
   * Which keys in `data` were pre-filled by the sibling carry-over rather than typed by
   * the family on this agreement.
   *
   * Recorded so the wizard can SAY which values were carried over. Two reasons that
   * matters: a pre-populated value on a document someone is about to sign should be
   * confirmed rather than assumed, and a family who reaches an apparently-blank first step
   * with no explanation concludes the carry-over is broken — which is exactly what was
   * reported.
   */
  seededFields?: string[];
  /**
   * Set once this draft's agreement has been successfully submitted.
   *
   * The draft is NOT deleted at that point, because the "enroll another child" flow needs
   * the guardian's contact details to carry over — deleting it is exactly the bug that made
   * sibling pre-fill silently do nothing. Instead the draft is stripped to just the
   * carry-over fields (no medical history, no student identity, no signature) and marked
   * here, so:
   *   - the sibling flow can still read the contact details
   *   - the step pages refuse to RESUME it, so nobody re-enters a submitted agreement
   *   - the TTL index still reaps it
   */
  submittedAt?: Date | null;
  createdAt: Date;
  /** TTL index watches this field. */
  updatedAt: Date;
}

/* -------------------------------- Attendance ------------------------------- */

/** Document 6, Template A. Unique on (studentId, date). */
export interface AttendanceRecordDoc extends Base {
  studentId: ObjectId;
  /** Calendar day as "YYYY-MM-DD" — see the note at the top of this file. */
  date: string;
  code: AttendanceCode;
  notes?: string;
  recordedBy: ObjectId;
}

/* ------------------------------ Mastery log -------------------------------- */

/** Document 6, Template B. No letter grades by design. */
export interface MasteryLogDoc extends Base {
  studentId: ObjectId;
  subject: Subject;
  skill: string;
  dateMastered: Date;
  assessmentMethod: AssessmentMethod;
  /**
   * Set when this skill was credited via hierarchical competency assessment —
   * i.e. mastery of a complex task counted as proof of a constituent skill
   * (Document 3 §3.5). Records *which* complex demonstration supplied the proof.
   */
  inferredFromMasteryId?: ObjectId | null;
  notes?: string;
  recordedBy: ObjectId;
  schoolYear: string;
}

/* --------------------------- Behavioral records ---------------------------- */

/** Document 6, Template C. */
export interface BehaviorRecordDoc extends Base {
  studentId: ObjectId;
  /** Free-form reporting period, e.g. "2026 Q3". */
  period: string;
  pillar: BehaviorPillarId;
  targetBehavior: string;
  level: GeneralizationLevel;
  notes?: string;
  recordedBy: ObjectId;
}

/* --------------------------- Taekwondo progression ------------------------- */

/** Document 6, Template D. */
export interface TaekwondoRankDoc extends Base {
  studentId: ObjectId;
  rank: BeltRank;
  requirementsDemonstrated: string;
  assessmentDate: Date;
  /** Free text: assessors may be external examiners without user accounts. */
  assessedBy: string;
  recordedBy: ObjectId;
}

/* -------------------------------- Instructors ------------------------------ */

/** Document 5 §5.3. */
export interface InstructorDoc extends Base {
  name: string;
  role: string;
  credentials: string;
  startDate: Date;
  active: boolean;
  /** Optional link to a login account. */
  userId?: ObjectId | null;
  /** Compliance items from Document 5 §5.2. */
  compliance: {
    abaTrainingComplete: boolean;
    taekwondoOrientationComplete: boolean;
    subjectMatterCompetencyVerified: boolean;
    /**
     * Document 5 §5.2 requires clearance BEFORE any student contact. The admin UI
     * surfaces this as a hard blocker, not a checkbox to tidy up later.
     */
    backgroundCheckClearedAt?: Date | null;
    instructorAgreementSignedAt?: Date | null;
  };
  notes?: string;
}

/* ------------------------------- Partnerships ------------------------------ */

/** Document 8 — the employer MOU. */
export interface PartnershipDoc extends Base {
  organizationName: string;
  contactName: string;
  contactTitle?: string;
  address?: string;
  phone?: string;
  email?: string;
  studentIds: ObjectId[];
  pathway: CareerPathwayId;
  placementStartDate?: Date | null;
  placementEndDate?: Date | null;
  daysPerWeek?: number;
  hoursPerDay?: number;
  siteMentor?: string;
  compensationType: CompensationType;
  hourlyRate?: number | null;
  compensationOther?: string;
  status: PartnershipStatus;
  /** Document 8 §8.4 requires a written evaluation each quarter. */
  quarterlyEvaluations: {
    period: string;
    submittedAt: Date;
    summary: string;
  }[];
  /** Document 8 §8.3 — Iowa Code ch. 92 placement compliance review. */
  complianceReviewedAt?: Date | null;
  notes?: string;
}

/* --------------------------------- Inquiries ------------------------------- */

export interface InquiryDoc extends Base {
  type: InquiryType;
  name: string;
  email: string;
  phone?: string;
  message: string;
  /** Type-specific extras, e.g. subject competency for instructor inquiries. */
  details?: Record<string, string>;
  status: InquiryStatus;
  submissionIp?: string;
  emailStatus: EmailStatus;
}

/* ---------------------------------- Audit ---------------------------------- */

/**
 * Append-only. Never updated, never deleted.
 *
 * `actorId` is null only for unauthenticated events (a failed login attempt).
 */
export interface AuditLogDoc {
  _id?: ObjectId;
  at: Date;
  actorId: ObjectId | null;
  actorEmail?: string;
  actorRole?: Role;
  action: AuditAction;
  /** The record acted upon, when applicable. */
  subjectId?: ObjectId | null;
  subjectType?: "student" | "application" | "user" | "instructor" | "partnership";
  /**
   * Small, non-sensitive context only — e.g. { from: "submitted", to: "accepted" }.
   * NEVER medical detail, behavioral notes, or anything from a student record.
   */
  meta?: Record<string, string | number | boolean | null>;
  ip?: string;
}

/* ------------------------------- Rate limits ------------------------------- */

/**
 * Counter buckets for login throttling and public-form abuse control. A TTL index
 * on expiresAt does the cleanup, which is why this needs no Redis.
 */
export interface RateLimitDoc {
  _id?: ObjectId;
  /** e.g. "login:ip:203.0.113.5" or "enroll:email:sha256(...)". */
  key: string;
  count: number;
  /** TTL index watches this field. */
  expiresAt: Date;
  firstAttemptAt: Date;
}

/* ------------------------------- Email queue ------------------------------- */

/**
 * Failed sends land here for retry. The governing rule: a submission is NEVER
 * lost because email failed. The record is saved first, then the email attempted.
 */
export interface EmailQueueDoc extends Base {
  to: string;
  subject: string;
  /** Template identifier plus its data — not the rendered body. */
  template: string;
  data: Record<string, unknown>;
  status: EmailStatus;
  attempts: number;
  lastError?: string;
  nextAttemptAt: Date;
  /** Links the email back to whatever triggered it. */
  relatedId?: ObjectId | null;
}

/* ------------------------------- Translations ------------------------------ */

/**
 * A cached machine translation of PUBLIC page copy.
 *
 * WHY THIS COLLECTION EXISTS
 *
 * The language lens translates marketing copy on demand. Without a cache, every visitor
 * who taps a paragraph pays for a fresh model call and the cost scales with traffic. With
 * one, each distinct paragraph is translated ONCE, EVER, and the steady-state cost of the
 * whole feature is zero. The cache is not an optimisation here — it is the reason the
 * feature is affordable at all.
 *
 * DELIBERATELY NO TTL. Every other cache-shaped collection in this schema expires
 * (`rateLimits`, `enrollmentDrafts`); this one must not. Marketing copy is stable, and an
 * expiry would quietly convert a one-time cost back into a recurring one — the exact
 * property the design depends on.
 *
 * ⚠️  NOTHING PRIVATE IS EVER STORED HERE. Every row is text that already appears on a
 * public page. The endpoint that writes it is scoped to the marketing routes and refuses
 * enrollment-agreement text; no student record, no application, and no family submission
 * can reach this collection.
 */
export interface TranslationDoc extends Base {
  /** sha256(normalisedSourceText + ":" + targetLocale). The unique cache key. */
  contentHash: string;
  /** The English source, stored so a bad translation can be traced back to its input. */
  sourceText: string;
  targetLocale: Locale;
  translatedText: string;
  /** Which model produced it — lets a future model change invalidate selectively. */
  model: string;
}
