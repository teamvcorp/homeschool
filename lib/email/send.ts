import "server-only";
import { env } from "../env";
import { emailQueueCollection } from "../db/collections";
import type { ObjectId } from "mongodb";

/**
 * TRANSACTIONAL EMAIL
 * =============================================================================
 * Resend over the REST API — no SDK. The API is a single POST, and one fewer
 * dependency in the tree that touches secrets is worth the twenty lines.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO RULES THAT ARE NOT NEGOTIABLE
 *
 * 1. A SUBMISSION IS NEVER LOST BECAUSE EMAIL FAILED.
 *    The database write always happens first; email is attempted afterwards. If it
 *    fails, the record is flagged and queued for retry, and an admin sees it in the
 *    dashboard. A family who completes a fifteen-minute enrollment agreement must
 *    never be told to start again because a third-party API had a bad minute.
 *
 * 2. NO STUDENT RECORD CONTENT IN AN EMAIL BODY.
 *    No medical conditions, no medications, no behavioral notes, no date of birth.
 *    Email is unencrypted at rest on servers we do not control and gets forwarded by
 *    accident. Staff notifications carry a name and a link into the authenticated
 *    admin view; the detail stays behind the login.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Template id and data, stored for retry rather than the rendered body. */
  template: string;
  data?: Record<string, unknown>;
  /** Links the queued email back to whatever triggered it. */
  relatedId?: ObjectId | null;
  replyTo?: string;
}

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string; queued: boolean };

/**
 * Sends an email, queueing it for retry on failure.
 *
 * Never throws. Callers treat email as best-effort and check `ok` only to decide
 * whether to tell the user "we have emailed you a copy".
 */
export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  // No API key configured (local development, or before Resend is set up). Queue it
  // so nothing is silently dropped, and say so plainly in the log.
  if (!env.RESEND_API_KEY) {
    await queueForRetry(input, "RESEND_API_KEY not configured");
    console.warn(
      `[email] no RESEND_API_KEY — queued "${input.subject}" for ${redact(input.to)}`,
    );
    return { ok: false, error: "Email is not configured", queued: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      // Do not let a hanging provider hold a server action open.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const error = `Resend responded ${response.status}: ${detail.slice(0, 300)}`;
      await queueForRetry(input, error);
      console.error(`[email] send failed — ${error}`);
      return { ok: false, error, queued: true };
    }

    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, id: body?.id ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    await queueForRetry(input, message);
    console.error(`[email] send threw — ${message}`);
    return { ok: false, error: message, queued: true };
  }
}

/**
 * Stores a failed send for later retry.
 *
 * Persists the template id and its data, not the rendered HTML — a template fix ships
 * with the next deploy and the retry picks it up, rather than resending the broken
 * version forever.
 */
async function queueForRetry(input: SendEmailInput, error: string): Promise<void> {
  try {
    const queue = await emailQueueCollection();
    const now = new Date();
    await queue.insertOne({
      to: input.to,
      subject: input.subject,
      template: input.template,
      data: input.data ?? {},
      status: "failed",
      attempts: 1,
      lastError: error.slice(0, 500),
      // First retry in five minutes; the retry route applies backoff after that.
      nextAttemptAt: new Date(now.getTime() + 5 * 60 * 1000),
      relatedId: input.relatedId ?? null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (queueError) {
    // Queueing failed too. Log loudly and move on — this must not break the request.
    console.error("[email] failed to queue for retry", queueError);
  }
}

/** Partially masks an address for logs. Logs get shared; addresses are personal data. */
export function redact(address: string): string {
  const [local, domain] = address.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}
