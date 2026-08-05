import "server-only";
import { consumeRateLimit, RATE_LIMITS } from "../auth/rate-limit";
import { sendEmail, queueEmail, redact, type SendEmailInput } from "./send";

/**
 * FAMILY STATUS NOTIFICATIONS
 * =============================================================================
 * One place that knows how to tell a family their application moved, and — more
 * importantly — one place that guarantees doing so can never break the staff action
 * that triggered it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE INVARIANT
 *
 * An administrator marking an application "accepted" is recording a DECISION. That
 * decision is already committed to the database before this function is called, and it
 * must stay committed regardless of what Resend does. So:
 *
 *   - This function NEVER throws. Every failure path is caught and logged.
 *   - It returns an outcome the caller may record, but the caller must not branch on it
 *     in a way that undoes the write.
 *   - It is called AFTER the database write and AFTER the audit entry, never before.
 *
 * The mirror of the rule already established for submissions in lib/email/send.ts: a
 * submission is never lost because email failed. Here: a decision is never reversed
 * because email failed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY IT SHARES THE ENROLLMENT BREAKER
 *
 * These messages leave the same verified domain as the enrollment confirmations, so they
 * spend the same reputation. A bug that loops a status change would otherwise emit
 * unlimited mail from the school's domain. On trip the message is parked in the retry
 * queue rather than dropped, so nothing is lost — it just arrives late.
 *
 * Volume is low by design: three messages per family for the whole admissions process,
 * against a daily cap of ~40, so a real school day cannot exhaust it.
 */

export interface NotifyOutcome {
  /** Delivered to the provider. */
  sent: boolean;
  /** Parked for the retry drainer instead of sent. */
  queued: boolean;
}

/**
 * Sends a family notification, or queues it, and reports which happened.
 *
 * `context` appears in logs to make an incident legible — pass something like
 * "application accepted" rather than a template id.
 */
export async function notifyFamily(
  input: SendEmailInput,
  context: string,
): Promise<NotifyOutcome> {
  try {
    const budget = await consumeRateLimit(
      // Deliberately the SAME key as the submission path: one budget for all outbound
      // enrollment mail, because they share one sending reputation.
      "enroll-submit:email-global",
      RATE_LIMITS.ENROLLMENT_EMAIL_GLOBAL_PER_DAY.limit,
      RATE_LIMITS.ENROLLMENT_EMAIL_GLOBAL_PER_DAY.windowSeconds,
    );

    if (!budget.allowed) {
      console.error(
        `[email] ENROLLMENT EMAIL BREAKER TRIPPED — "${context}" for ${redact(input.to)} is QUEUED, not sent. Investigate for abuse before raising the cap.`,
      );
      await queueEmail(input, `breaker tripped: ${context}`, 60 * 60 * 1000);
      return { sent: false, queued: true };
    }

    const result = await sendEmail(input);
    if (!result.ok) {
      // sendEmail has already queued it for retry and logged the cause.
      console.warn(
        `[email] "${context}" for ${redact(input.to)} did not send; queued for retry.`,
      );
      return { sent: false, queued: result.queued };
    }

    return { sent: true, queued: false };
  } catch (error) {
    /**
     * Belt and braces. sendEmail and queueEmail both already swallow their own errors,
     * so reaching here means something unexpected — a database outage while consuming
     * the rate limit, most likely. Log it and carry on: the staff action stands.
     */
    console.error(`[email] notifyFamily threw for "${context}"`, error);
    return { sent: false, queued: false };
  }
}
