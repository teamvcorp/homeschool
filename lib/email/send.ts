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
  /**
   * Suppresses the retry queue for this message. On failure it is logged and dropped.
   *
   * ⚠️  THIS DELIBERATELY BREAKS RULE 1 ABOVE, and there is exactly one class of message
   * that warrants it: one whose body contains a LIVE CREDENTIAL.
   *
   * A password-reset link is a bearer token. Queuing it writes that token into
   * `emailQueue.data` in plain text — precisely what storing only `tokenHash` exists to
   * prevent (see AuthTokenDoc). A leaked backup would hand over working reset links for
   * every message that happened to be waiting.
   *
   * The retry would also usually be pointless: a reset token lives one hour and the
   * drainer's backoff is 5, 20, 45, 80 minutes, so most retries would deliver a link that
   * is already dead — which reads to the recipient as the system being broken.
   *
   * Nothing is lost by dropping it. The reset form cannot report a send failure anyway
   * (that would confirm the address exists), so the user sees the same message either
   * way and simply asks again — which mints a fresh token. The flow is self-healing in a
   * way an enrollment submission is not, which is why the rule holds there and not here.
   */
  doNotPersist?: boolean;
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
 * Queues a message for the retry drainer WITHOUT attempting to send it now.
 *
 * Exists for the enrollment email circuit breaker: when the global daily send budget is
 * exhausted, the application is still stored and its emails must not be silently dropped —
 * they are parked here for /api/email/retry to drain later. That keeps the "a submission is
 * never lost because email failed" promise intact while protecting the sending domain's
 * reputation, which parent-portal and password-reset mail also depend on.
 *
 * `delayMs` sets the first attempt. Give the breaker a delay longer than a few minutes so
 * the drainer does not immediately re-attempt into the same condition.
 */
export async function queueEmail(
  input: SendEmailInput,
  reason: string,
  delayMs = 5 * 60 * 1000,
): Promise<void> {
  return queueForRetry(input, reason, delayMs);
}

/**
 * Stores a failed (or deliberately deferred) send for later retry.
 *
 * Persists the template id and its data, not the rendered HTML — a template fix ships
 * with the next deploy and the retry picks it up, rather than resending the broken
 * version forever.
 */
async function queueForRetry(
  input: SendEmailInput,
  error: string,
  delayMs = 5 * 60 * 1000,
): Promise<void> {
  /**
   * The credential-carrying opt-out. See `doNotPersist` on SendEmailInput for why one
   * class of message must never reach this collection. Logged so a run of failures is
   * still visible in the console even though nothing is stored.
   */
  if (input.doNotPersist) {
    console.error(
      `[email] dropped (not queued — carries a credential) "${input.subject}" for ${redact(input.to)} — ${error.slice(0, 200)}`,
    );
    return;
  }

  try {
    const queue = await emailQueueCollection();
    const now = new Date();
    await queue.insertOne({
      to: input.to,
      subject: input.subject,
      template: input.template,
      data: input.data ?? {},
      // "failed" is what the drainer's query selects on. A deferred message is not a
      // failure in spirit, but reusing the status keeps one code path for retries.
      status: "failed",
      attempts: 1,
      lastError: error.slice(0, 500),
      nextAttemptAt: new Date(now.getTime() + delayMs),
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
