import "server-only";
import { getDb } from "../mongodb";
import { COLLECTIONS } from "./collections";

/**
 * INDEX DEFINITIONS
 * =============================================================================
 * Run via `npm run db:init`, which is idempotent — createIndex is a no-op when an
 * identical index already exists.
 *
 * Deliberately NOT run on application boot. Doing that on a serverless platform
 * means every cold start issues a dozen index commands against Atlas, which is
 * both slow and pointless.
 *
 * Two indexes here are correctness features rather than performance ones:
 *  - attendance (studentId, date) UNIQUE prevents two conflicting attendance
 *    marks for the same student on the same day.
 *  - enrollmentApplications.idempotencyKey UNIQUE makes a double-submitted
 *    application a no-op instead of a duplicate record.
 */

export async function createIndexes(): Promise<string[]> {
  const db = await getDb();
  const created: string[] = [];

  const note = (label: string) => created.push(label);

  // --- users ---------------------------------------------------------------
  const users = db.collection(COLLECTIONS.users);
  await users.createIndex(
    { email: 1 },
    {
      unique: true,
      name: "email_unique",
      // Case-insensitive uniqueness so Bob@x.com and bob@x.com cannot coexist.
      // (Emails are also lowercased before storage — belt and braces.)
      collation: { locale: "en", strength: 2 },
    },
  );
  note("users.email_unique");
  await users.createIndex({ role: 1, active: 1 }, { name: "role_active" });
  note("users.role_active");
  await users.createIndex({ studentIds: 1 }, { name: "guardian_students" });
  note("users.guardian_students");

  // --- students ------------------------------------------------------------
  const students = db.collection(COLLECTIONS.students);
  await students.createIndex({ status: 1, cohort: 1 }, { name: "status_cohort" });
  note("students.status_cohort");
  await students.createIndex({ legalName: 1 }, { name: "legalName" });
  note("students.legalName");
  await students.createIndex({ archivedAt: 1 }, { name: "archivedAt" });
  note("students.archivedAt");
  /**
   * School ID and school email are unique WHERE PRESENT.
   *
   * `partialFilterExpression` restricts the constraint to documents where the field is a
   * string, so the many students without one yet do not all collide on null — which a plain
   * unique index would cause after the second record.
   */
  await students.createIndex(
    { schoolId: 1 },
    {
      unique: true,
      name: "schoolId_unique",
      partialFilterExpression: { schoolId: { $type: "string" } },
    },
  );
  note("students.schoolId_unique (partial)");
  await students.createIndex(
    { schoolEmail: 1 },
    {
      unique: true,
      name: "schoolEmail_unique",
      partialFilterExpression: { schoolEmail: { $type: "string" } },
    },
  );
  note("students.schoolEmail_unique (partial)");

  // --- enrollmentApplications ---------------------------------------------
  const applications = db.collection(COLLECTIONS.enrollmentApplications);
  await applications.createIndex(
    { idempotencyKey: 1 },
    { unique: true, name: "idempotencyKey_unique" },
  );
  note("enrollmentApplications.idempotencyKey_unique");
  await applications.createIndex(
    { status: 1, submittedAt: -1 },
    { name: "status_submittedAt" },
  );
  note("enrollmentApplications.status_submittedAt");
  await applications.createIndex(
    { "guardian.email": 1 },
    { name: "guardian_email" },
  );
  note("enrollmentApplications.guardian_email");

  // --- enrollmentDrafts ----------------------------------------------------
  const drafts = db.collection(COLLECTIONS.enrollmentDrafts);
  await drafts.createIndex({ draftId: 1 }, { unique: true, name: "draftId_unique" });
  note("enrollmentDrafts.draftId_unique");
  await drafts.createIndex(
    { updatedAt: 1 },
    {
      // TTL: abandoned drafts self-destruct after 14 days. This is a privacy
      // feature as much as a housekeeping one — a half-entered medical history
      // should not sit in the database forever.
      expireAfterSeconds: 60 * 60 * 24 * 14,
      name: "updatedAt_ttl",
    },
  );
  note("enrollmentDrafts.updatedAt_ttl (14d)");
  /**
   * A SECOND, much shorter TTL for submitted carry-over stubs.
   *
   * After a submit the draft is stripped to the sibling carry-over fields and marked
   * `submittedAt`. Those fields are still a family's address, phone, emergency contact and
   * doctor, and the application record already holds them — so the stub has no reason to
   * survive the sitting it was created in. The 14-day `updatedAt` TTL above is right for an
   * abandoned in-progress draft and far too long for this.
   *
   * MongoDB permits multiple TTL indexes on one collection as long as they watch different
   * fields, so both apply: whichever fires first wins. `submittedAt` is absent on
   * in-progress drafts, and a TTL index ignores documents where the field is missing or not
   * a date — so this only ever reaps submitted stubs.
   */
  await drafts.createIndex(
    { submittedAt: 1 },
    {
      expireAfterSeconds: 60 * 60 * 24,
      name: "submittedAt_ttl",
    },
  );
  note("enrollmentDrafts.submittedAt_ttl (24h)");

  // --- attendance ----------------------------------------------------------
  const attendance = db.collection(COLLECTIONS.attendance);
  await attendance.createIndex(
    { studentId: 1, date: 1 },
    { unique: true, name: "student_date_unique" },
  );
  note("attendance.student_date_unique");
  await attendance.createIndex({ date: 1 }, { name: "date" });
  note("attendance.date");

  // --- masteryLogs ---------------------------------------------------------
  const mastery = db.collection(COLLECTIONS.masteryLogs);
  await mastery.createIndex(
    { studentId: 1, subject: 1, dateMastered: -1 },
    { name: "student_subject_date" },
  );
  note("masteryLogs.student_subject_date");
  await mastery.createIndex(
    { studentId: 1, schoolYear: 1 },
    { name: "student_schoolYear" },
  );
  note("masteryLogs.student_schoolYear");

  // --- behaviorRecords -----------------------------------------------------
  const behavior = db.collection(COLLECTIONS.behaviorRecords);
  await behavior.createIndex(
    { studentId: 1, period: 1, pillar: 1 },
    { name: "student_period_pillar" },
  );
  note("behaviorRecords.student_period_pillar");

  // --- taekwondoRanks ------------------------------------------------------
  const taekwondo = db.collection(COLLECTIONS.taekwondoRanks);
  await taekwondo.createIndex(
    { studentId: 1, assessmentDate: -1 },
    { name: "student_assessmentDate" },
  );
  note("taekwondoRanks.student_assessmentDate");

  // --- instructors ---------------------------------------------------------
  const instructors = db.collection(COLLECTIONS.instructors);
  await instructors.createIndex({ active: 1, name: 1 }, { name: "active_name" });
  note("instructors.active_name");

  // --- partnerships --------------------------------------------------------
  const partnerships = db.collection(COLLECTIONS.partnerships);
  await partnerships.createIndex({ status: 1 }, { name: "status" });
  note("partnerships.status");
  await partnerships.createIndex({ studentIds: 1 }, { name: "studentIds" });
  note("partnerships.studentIds");

  // --- inquiries -----------------------------------------------------------
  const inquiries = db.collection(COLLECTIONS.inquiries);
  await inquiries.createIndex(
    { status: 1, createdAt: -1 },
    { name: "status_createdAt" },
  );
  note("inquiries.status_createdAt");

  // --- auditLog ------------------------------------------------------------
  const audit = db.collection(COLLECTIONS.auditLog);
  await audit.createIndex({ at: -1 }, { name: "at" });
  note("auditLog.at");
  await audit.createIndex({ actorId: 1, at: -1 }, { name: "actor_at" });
  note("auditLog.actor_at");
  // The FERPA question "who accessed this student's record?" is this index.
  await audit.createIndex({ subjectId: 1, at: -1 }, { name: "subject_at" });
  note("auditLog.subject_at");

  // --- rateLimits ----------------------------------------------------------
  const rateLimits = db.collection(COLLECTIONS.rateLimits);
  await rateLimits.createIndex({ key: 1 }, { unique: true, name: "key_unique" });
  note("rateLimits.key_unique");
  await rateLimits.createIndex(
    { expiresAt: 1 },
    // TTL with expireAfterSeconds: 0 means "delete when expiresAt passes".
    // This is what replaces Redis for counter expiry.
    { expireAfterSeconds: 0, name: "expiresAt_ttl" },
  );
  note("rateLimits.expiresAt_ttl");

  // --- emailQueue ----------------------------------------------------------
  const emailQueue = db.collection(COLLECTIONS.emailQueue);
  await emailQueue.createIndex(
    { status: 1, nextAttemptAt: 1 },
    { name: "status_nextAttempt" },
  );
  note("emailQueue.status_nextAttempt");

  // --- translations ---------------------------------------------------------
  /**
   * The cache key, and the reason this feature costs a fixed amount rather than a
   * per-visitor one. UNIQUE so a race between two readers tapping the same paragraph
   * resolves to one stored row rather than two — the writer uses an upsert keyed on this.
   *
   * No TTL: marketing copy is stable, and expiring the cache would silently turn a
   * one-time cost back into a recurring one.
   */
  const translations = db.collection(COLLECTIONS.translations);
  await translations.createIndex(
    { contentHash: 1 },
    { unique: true, name: "contentHash_unique" },
  );
  note("translations.contentHash_unique");

  // --- authTokens -----------------------------------------------------------
  /**
   * The ONLY way to find a token row is by the hash of the token itself. There is
   * deliberately no index that would make "list this user's live tokens" cheap from
   * the outside — the emailed value is the capability, and nothing else should be.
   *
   * UNIQUE both as a correctness guard and because a collision would mean two
   * subjects sharing one link.
   */
  const authTokens = db.collection(COLLECTIONS.authTokens);
  await authTokens.createIndex(
    { tokenHash: 1 },
    { unique: true, name: "tokenHash_unique" },
  );
  note("authTokens.tokenHash_unique");
  /**
   * Cleanup, NOT the expiry check. Mongo's TTL monitor runs about once a minute, so a
   * token can outlive `expiresAt` briefly; lib/auth/token.ts compares the date itself
   * and refuses regardless. Without this index the collection would grow forever.
   */
  await authTokens.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "expiresAt_ttl" },
  );
  note("authTokens.expiresAt_ttl");
  /**
   * Supports superseding: issuing a new token invalidates that subject's outstanding
   * ones, so a forwarded or intercepted earlier link stops working the moment the real
   * owner asks again. Sparse on each field since a row carries userId XOR draftId.
   */
  await authTokens.createIndex(
    { userId: 1, purpose: 1 },
    { name: "user_purpose", sparse: true },
  );
  note("authTokens.user_purpose");
  await authTokens.createIndex(
    { draftId: 1, purpose: 1 },
    { name: "draft_purpose", sparse: true },
  );
  note("authTokens.draft_purpose");

  return created;
}
