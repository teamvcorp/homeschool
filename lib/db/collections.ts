import "server-only";
import type { Collection } from "mongodb";
import { getDb } from "../mongodb";
import type {
  UserDoc,
  StudentDoc,
  EnrollmentApplicationDoc,
  EnrollmentDraftDoc,
  AttendanceRecordDoc,
  MasteryLogDoc,
  BehaviorRecordDoc,
  TaekwondoRankDoc,
  InstructorDoc,
  PartnershipDoc,
  InquiryDoc,
  AuditLogDoc,
  RateLimitDoc,
  EmailQueueDoc,
  TranslationDoc,
  AuthTokenDoc,
} from "./types";

/**
 * TYPED COLLECTION ACCESSORS
 * =============================================================================
 * One place that maps a collection name to its document type. Every query in the
 * app goes through these, so a renamed collection or a changed shape is a single
 * edit and a compile error at each call site rather than a silent empty result.
 *
 * Collection names are also exported for the index-creation script.
 */

export const COLLECTIONS = {
  users: "users",
  students: "students",
  enrollmentApplications: "enrollmentApplications",
  enrollmentDrafts: "enrollmentDrafts",
  attendance: "attendance",
  masteryLogs: "masteryLogs",
  behaviorRecords: "behaviorRecords",
  taekwondoRanks: "taekwondoRanks",
  instructors: "instructors",
  partnerships: "partnerships",
  inquiries: "inquiries",
  auditLog: "auditLog",
  rateLimits: "rateLimits",
  emailQueue: "emailQueue",
  translations: "translations",
  authTokens: "authTokens",
} as const;

/**
 * Cached machine translations of PUBLIC page copy.
 *
 * Deliberately its own collection and deliberately WITHOUT a TTL — see TranslationDoc in
 * ./types.ts. It holds no student data and nothing a family submitted; every row is public
 * marketing copy that already appears on the site.
 */
export async function translationsCollection(): Promise<Collection<TranslationDoc>> {
  return (await getDb()).collection<TranslationDoc>(COLLECTIONS.translations);
}

export async function usersCollection(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>(COLLECTIONS.users);
}

export async function studentsCollection(): Promise<Collection<StudentDoc>> {
  return (await getDb()).collection<StudentDoc>(COLLECTIONS.students);
}

export async function applicationsCollection(): Promise<
  Collection<EnrollmentApplicationDoc>
> {
  return (await getDb()).collection<EnrollmentApplicationDoc>(
    COLLECTIONS.enrollmentApplications,
  );
}

export async function draftsCollection(): Promise<Collection<EnrollmentDraftDoc>> {
  return (await getDb()).collection<EnrollmentDraftDoc>(
    COLLECTIONS.enrollmentDrafts,
  );
}

export async function attendanceCollection(): Promise<
  Collection<AttendanceRecordDoc>
> {
  return (await getDb()).collection<AttendanceRecordDoc>(COLLECTIONS.attendance);
}

export async function masteryCollection(): Promise<Collection<MasteryLogDoc>> {
  return (await getDb()).collection<MasteryLogDoc>(COLLECTIONS.masteryLogs);
}

export async function behaviorCollection(): Promise<Collection<BehaviorRecordDoc>> {
  return (await getDb()).collection<BehaviorRecordDoc>(
    COLLECTIONS.behaviorRecords,
  );
}

export async function taekwondoCollection(): Promise<Collection<TaekwondoRankDoc>> {
  return (await getDb()).collection<TaekwondoRankDoc>(COLLECTIONS.taekwondoRanks);
}

export async function instructorsCollection(): Promise<Collection<InstructorDoc>> {
  return (await getDb()).collection<InstructorDoc>(COLLECTIONS.instructors);
}

export async function partnershipsCollection(): Promise<
  Collection<PartnershipDoc>
> {
  return (await getDb()).collection<PartnershipDoc>(COLLECTIONS.partnerships);
}

export async function inquiriesCollection(): Promise<Collection<InquiryDoc>> {
  return (await getDb()).collection<InquiryDoc>(COLLECTIONS.inquiries);
}

export async function auditCollection(): Promise<Collection<AuditLogDoc>> {
  return (await getDb()).collection<AuditLogDoc>(COLLECTIONS.auditLog);
}

export async function rateLimitsCollection(): Promise<Collection<RateLimitDoc>> {
  return (await getDb()).collection<RateLimitDoc>(COLLECTIONS.rateLimits);
}

export async function emailQueueCollection(): Promise<Collection<EmailQueueDoc>> {
  return (await getDb()).collection<EmailQueueDoc>(COLLECTIONS.emailQueue);
}

/**
 * Emailed password-reset, account-setup, and enrollment-resume tokens.
 *
 * Holds only hashes and expiries — never a usable token. See AuthTokenDoc in ./types.ts.
 */
export async function authTokensCollection(): Promise<Collection<AuthTokenDoc>> {
  return (await getDb()).collection<AuthTokenDoc>(COLLECTIONS.authTokens);
}
