import "server-only";
import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { auditCollection } from "./db/collections";
import type { AuditAction } from "./db/enums";
import type { AuditLogDoc } from "./db/types";
import type { AuthenticatedUser } from "./dal";

/**
 * AUDIT TRAIL
 * =============================================================================
 * Append-only record of who did what to which student record, and when.
 *
 * WHY READS ARE AUDITED, NOT JUST WRITES
 * This system holds minors' medical and behavioral records. Under FERPA the
 * question a school must be able to answer is not only "who changed this?" but
 * "who has SEEN this?" A read-only audit gap is the common failure.
 *
 * WHAT MUST NEVER GO IN `meta`
 * No medical detail, no behavioral notes, no free-text from a student record. The
 * audit log is queried and exported more freely than the records themselves, so
 * putting sensitive content here quietly widens its exposure. Keep meta to
 * identifiers and state transitions — { from: "submitted", to: "accepted" }.
 */

/**
 * Best-effort client IP.
 *
 * These headers are attacker-controllable in principle, so the value is evidence
 * rather than proof — fine for an audit trail, never acceptable as an authorization
 * input. On Vercel, x-forwarded-for's first entry is the real client.
 */
export async function getClientIp(): Promise<string | undefined> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return h.get("x-real-ip") ?? undefined;
}

export async function getUserAgent(): Promise<string | undefined> {
  const h = await headers();
  // Truncated: a user-agent is attacker-controlled input of unbounded length.
  return h.get("user-agent")?.slice(0, 500) ?? undefined;
}

interface LogAuditInput {
  actor: AuthenticatedUser | null;
  action: AuditAction;
  subjectId?: string | ObjectId | null;
  subjectType?: AuditLogDoc["subjectType"];
  meta?: AuditLogDoc["meta"];
}

/**
 * Writes an audit entry.
 *
 * NEVER THROWS. An audit write failing must not roll back or block the operation
 * it describes — a parent should not be unable to enroll because the log was
 * briefly unavailable. Failures are reported to the server console for alerting.
 *
 * The trade-off is deliberate and worth stating: availability over guaranteed
 * completeness of the trail. If this system ever needs a provably gap-free audit
 * log, that requires writing the audit entry inside the same transaction as the
 * mutation — a significant change, and not warranted at this scale.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    const collection = await auditCollection();
    const ip = await getClientIp();

    const entry: AuditLogDoc = {
      at: new Date(),
      actorId: input.actor ? new ObjectId(input.actor.id) : null,
      actorEmail: input.actor?.email,
      actorRole: input.actor?.role,
      action: input.action,
      subjectId: input.subjectId
        ? typeof input.subjectId === "string"
          ? new ObjectId(input.subjectId)
          : input.subjectId
        : null,
      subjectType: input.subjectType,
      meta: input.meta,
      ip,
    };

    await collection.insertOne(entry);
  } catch (error) {
    console.error("[audit] failed to write audit entry", {
      action: input.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Logs a failed login.
 *
 * Separate helper because there is no actor yet, and because the email is recorded
 * deliberately: repeated failures against one address are the signal worth seeing.
 */
export async function logFailedLogin(email: string): Promise<void> {
  try {
    const collection = await auditCollection();
    await collection.insertOne({
      at: new Date(),
      actorId: null,
      actorEmail: email.toLowerCase().trim(),
      action: "auth.loginFailed",
      ip: await getClientIp(),
    });
  } catch (error) {
    console.error("[audit] failed to log failed login", error);
  }
}
