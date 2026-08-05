import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { safeCompare } from "@/lib/auth/password";
import { emailQueueCollection } from "@/lib/db/collections";
import { sendEmail } from "@/lib/email/send";
import {
  enrollmentConfirmationEmail,
  newApplicationNotificationEmail,
  inquiryNotificationEmail,
  intakeScheduledEmail,
  applicationAcceptedEmail,
  enrollmentWelcomeEmail,
} from "@/lib/email/templates";
import { coerceLocale } from "@/lib/i18n/locales";

/**
 * EMAIL RETRY DRAINER
 * =============================================================================
 * Re-sends queued emails that failed on first attempt. Without this the queue is a
 * write-only graveyard and the "we never lose a submission" promise is half-kept: the
 * record survives, but the family never hears back.
 *
 * Invoke from a scheduler (Vercel Cron, or any external caller):
 *
 *   POST /api/email/retry
 *   Authorization: Bearer <CRON_SECRET>
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SECURITY
 *
 * This endpoint sends email, so an unauthenticated caller could use it as a relay or
 * simply to burn the send quota. It therefore requires CRON_SECRET, compared in
 * constant time (a plain === leaks the secret one byte at a time through timing).
 *
 * If CRON_SECRET is unset the route returns 503 rather than running unprotected —
 * failing closed is the only safe default for something that can send mail.
 *
 * It re-renders from the stored template id and data rather than a saved HTML body, so
 * a template fix ships with the next deploy and the retry picks it up instead of
 * resending the broken version forever.
 */

/** Give up after this many attempts; a human should look at it by then. */
const MAX_ATTEMPTS = 5;

/** Cap per invocation so one run cannot fan out unboundedly. */
const BATCH_SIZE = 20;

function rerender(template: string, data: Record<string, unknown>) {
  const s = (key: string) => (typeof data[key] === "string" ? (data[key] as string) : "");

  switch (template) {
    case "enrollmentConfirmation":
      return enrollmentConfirmationEmail({
        guardianName: s("guardianName"),
        studentName: s("studentName"),
        locale: coerceLocale(data.locale),
      });
    case "newApplicationNotification":
      return newApplicationNotificationEmail({
        studentName: s("studentName"),
        guardianName: s("guardianName"),
        guardianEmail: s("guardianEmail"),
        guardianPhone: s("guardianPhone"),
        applicationId: s("applicationId"),
      });
    case "inquiryNotification":
      return inquiryNotificationEmail({
        type: s("type"),
        name: s("name"),
        email: s("email"),
        phone: s("phone") || undefined,
        message: s("message"),
      });

    /**
     * FAMILY STATUS NOTIFICATIONS.
     *
     * ⚠️  EVERY ONE OF THESE MUST READ `locale` FROM `data`. A queued message is
     * re-rendered here, long after the request that created it, so the locale has to
     * travel in the stored data — there is no cookie and no request context at this
     * point. Forgetting it does not error; it silently sends a Spanish-speaking family
     * an English letter, which is precisely the failure this feature exists to prevent.
     *
     * `coerceLocale` because `data` came out of the database and is therefore untrusted
     * for the purpose of indexing the message catalogue.
     */
    case "intakeScheduled":
      return intakeScheduledEmail({
        guardianName: s("guardianName"),
        studentName: s("studentName"),
        locale: coerceLocale(data.locale),
      });
    case "applicationAccepted":
      return applicationAcceptedEmail({
        guardianName: s("guardianName"),
        studentName: s("studentName"),
        locale: coerceLocale(data.locale),
      });
    case "enrollmentWelcome":
      return enrollmentWelcomeEmail({
        guardianName: s("guardianName"),
        studentName: s("studentName"),
        schoolEmail: s("schoolEmail"),
        locale: coerceLocale(data.locale),
      });
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Retry endpoint is not configured" },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  if (!safeCompare(header, expected)) {
    // Deliberately terse: no hint about whether the header was missing or wrong.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queue = await emailQueueCollection();
  const now = new Date();

  const due = await queue
    .find({
      status: "failed",
      attempts: { $lt: MAX_ATTEMPTS },
      nextAttemptAt: { $lte: now },
    })
    .limit(BATCH_SIZE)
    .toArray();

  let sent = 0;
  let stillFailing = 0;
  let unknownTemplate = 0;

  for (const item of due) {
    const rendered = rerender(item.template, item.data);

    if (!rendered) {
      unknownTemplate += 1;
      // A template that no longer exists will never succeed. Park it at MAX_ATTEMPTS
      // rather than retrying forever.
      await queue.updateOne(
        { _id: item._id },
        {
          $set: {
            attempts: MAX_ATTEMPTS,
            lastError: `Unknown template "${item.template}"`,
            updatedAt: new Date(),
          },
        },
      );
      continue;
    }

    const result = await sendEmail({
      to: item.to,
      ...rendered,
      template: item.template,
      data: item.data,
      relatedId: item.relatedId ?? null,
    });

    if (result.ok) {
      sent += 1;
      await queue.updateOne(
        { _id: item._id },
        { $set: { status: "sent", updatedAt: new Date() } },
      );
    } else {
      stillFailing += 1;
      const attempts = item.attempts + 1;
      // Exponential backoff: 5min, 20min, 45min, 80min…
      const delayMinutes = 5 * attempts * attempts;
      await queue.updateOne(
        { _id: item._id },
        {
          $set: {
            attempts,
            lastError: result.ok ? "" : result.error.slice(0, 500),
            nextAttemptAt: new Date(Date.now() + delayMinutes * 60 * 1000),
            updatedAt: new Date(),
          },
        },
      );
    }
  }

  return NextResponse.json({
    examined: due.length,
    sent,
    stillFailing,
    unknownTemplate,
  });
}

/**
 * GET returns 405 automatically for undeclared methods, but declaring this makes the
 * intent explicit: retrying is a mutation and must not be triggerable by a browser
 * visit, a crawler, or a link preview.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Use POST with an Authorization bearer token" },
    { status: 405 },
  );
}
