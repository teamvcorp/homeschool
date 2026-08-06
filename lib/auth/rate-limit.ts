import "server-only";
import { createHash } from "node:crypto";
import { rateLimitsCollection } from "../db/collections";

/**
 * RATE LIMITING WITHOUT REDIS
 * =============================================================================
 * Fixed-window counters in a MongoDB collection with a TTL index on `expiresAt`.
 *
 * WHY NOT IN-MEMORY: serverless functions do not share memory, and each cold start
 * gets a fresh map — an in-memory limiter on Vercel is decorative.
 *
 * WHY THIS IS ADEQUATE: the traffic here is a handful of logins and enrollment
 * submissions per day. A single atomic findOneAndUpdate per attempt is nothing,
 * and the TTL index does expiry for free. If this ever needs to survive a
 * thousand requests a second, that is the point to reach for Redis — not now.
 *
 * KNOWN LIMITATION: fixed windows allow a burst across a window boundary (up to
 * 2× the limit spanning two windows). For login throttling and form abuse that is
 * an acceptable trade against the complexity of a sliding window.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** When the current window resets. */
  resetAt: Date;
}

/**
 * Consumes one unit against `key`.
 *
 * The upsert is a single atomic operation, so two concurrent requests cannot both
 * read "count: 4" and both write "count: 5".
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const collection = await rateLimitsCollection();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  const doc = await collection.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      // Only set on insert: the window start must not slide forward on every hit,
      // or a steady stream of attempts would keep the window open forever.
      $setOnInsert: { firstAttemptAt: now, expiresAt },
    },
    { upsert: true, returnDocument: "after" },
  );

  // Defensive: upsert with returnDocument:"after" always yields a document.
  const count = doc?.count ?? 1;
  const windowEnd = doc?.expiresAt ?? expiresAt;

  // If the TTL sweeper has not yet removed an expired window, treat it as fresh.
  // Mongo's TTL monitor only runs about once a minute, so this is routine.
  if (windowEnd.getTime() <= now.getTime()) {
    await collection.updateOne(
      { key },
      { $set: { count: 1, firstAttemptAt: now, expiresAt } },
    );
    return { allowed: true, remaining: limit - 1, resetAt: expiresAt };
  }

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: windowEnd,
  };
}

/** Clears a counter — called after a successful login so one bad day doesn't linger. */
export async function resetRateLimit(key: string): Promise<void> {
  const collection = await rateLimitsCollection();
  await collection.deleteOne({ key });
}

/**
 * Hashes an identifier before it becomes part of a rate-limit key.
 *
 * Keeps raw emails and IPs out of a collection that exists only to count — the
 * limiter needs to recognise a repeat, not to know who it was.
 */
export function hashIdentifier(value: string): string {
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex").slice(0, 32);
}

/* --------------------------------- Policies -------------------------------- */

/**
 * Tuned deliberately:
 *  - LOGIN_PER_EMAIL is tighter than per-IP, because a targeted attack on one
 *    account is the greater risk and a whole family may share one IP.
 *  - LOGIN_PER_IP is loose enough that a school with several staff behind one
 *    NAT does not lock itself out.
 */
export const RATE_LIMITS = {
  LOGIN_PER_EMAIL: { limit: 5, windowSeconds: 15 * 60 },
  LOGIN_PER_IP: { limit: 20, windowSeconds: 15 * 60 },

  /**
   * Saving one wizard step. Deliberately generous.
   *
   * An earlier version reused the strict submit policy here, which end-to-end testing
   * caught: a real family completes six steps, revisits some to fix typos, and may
   * enrol siblings — comfortably more than a handful of saves. Locking them out
   * mid-agreement is a far worse outcome than tolerating a bot that pointlessly saves
   * drafts, since a draft is disposable and TTL-expired.
   *
   * The expensive, irreversible operation is the SUBMIT, and that is what
   * ENROLL_SUBMIT_* below guards.
   */
  ENROLL_STEP_PER_IP: { limit: 120, windowSeconds: 60 * 60 },

  /**
   * Starting an agreement — i.e. creating a draft record.
   *
   * Very generous: a family enrolling four children in one sitting legitimately triggers
   * this four times, and the action carries no user input worth protecting. The cap exists
   * purely to bound draft creation, which is the real denial-of-service path here: a draft
   * can hold ~2 KB of free text, and unbounded drafts fill the Atlas tier before they cost
   * anything in compute.
   *
   * CONSUMED BY BOTH ENTRY POINTS. `saveEnrollmentStep` also creates a draft when a POST
   * arrives without one, so it charges this same counter — otherwise the effective
   * draft-creation ceiling was ENROLL_START + ENROLL_STEP (160/hr), not 40/hr. A real
   * family passes through the implicit path at most once per agreement.
   */
  ENROLL_START_PER_IP: { limit: 40, windowSeconds: 60 * 60 },

  /**
   * ATTEMPTS at the final submit, charged BEFORE validation.
   *
   * Purpose: stop an unmetered loop of "POST garbage at the sign action" (each costs a
   * draft lookup and a whole-agreement zod parse) without letting a validation mistake eat
   * into the application budget below. 30/hr is roughly 15× what a real family needs even
   * if they fumble every checkbox on every child.
   */
  ENROLL_SUBMIT_ATTEMPT_PER_IP: { limit: 30, windowSeconds: 60 * 60 },

  /**
   * COMPLETE, VALID applications. Charged only after the whole-agreement schema passes,
   * immediately before the insert.
   *
   * 10/hr per IP rather than 6: this is now the cap on real applications only, and it must
   * clear a large family enrolling every child in one sitting with room to spare. It is
   * also the cap that a shared "unknown IP" bucket would apply to the entire school if a
   * proxy were ever misconfigured, which is a second reason not to run it tight.
   */
  ENROLL_SUBMIT_PER_IP: { limit: 10, windowSeconds: 60 * 60 },

  /**
   * Per guardian email address. THIS IS NOW ACTUALLY APPLIED — it was previously dead
   * config: checkPublicFormAbuse took one policy and used it for both the IP key and the
   * email key, so the real per-email cap was whatever the per-IP cap was.
   *
   * 8/day, not the 4/day it used to claim, because 4 would reject the fifth child of a
   * large family — a false rejection on a genuine agreement. 8 still bounds an IP-rotating
   * attacker to 8 school-branded emails per day at any one victim address, and the global
   * breaker below bounds the total regardless.
   */
  ENROLL_SUBMIT_PER_EMAIL: { limit: 8, windowSeconds: 24 * 60 * 60 },

  /**
   * GLOBAL outbound-email circuit breaker for the public enrollment path.
   *
   * The confirmation email goes to an address the submitter typed, so the enrollment form
   * is a relay a stranger can point at a stranger. The cost of abuse is not our compute —
   * it is the sending reputation of fyht4.com, which also carries parent-portal and
   * password-reset mail. Resend suspends senders around a ~0.1% complaint rate, and a free
   * tier is 100 messages a day.
   *
   * Checked AFTER the application is stored and it can NEVER reject a family: on trip the
   * agreement is saved and the emails are parked in the retry queue instead of sent, and an
   * admin is alerted. At ~5 genuine enrollments a week, 40/day is ~50× headroom.
   */
  ENROLLMENT_EMAIL_GLOBAL_PER_DAY: { limit: 40, windowSeconds: 24 * 60 * 60 },

  INQUIRY_PER_IP: { limit: 10, windowSeconds: 60 * 60 },

  /**
   * On-demand translation, per IP.
   *
   * Sized so that READING never trips it. Someone working through the handbook in Lao may
   * tap thirty or forty paragraphs in a sitting, and a limiter that cuts them off mid-page
   * fails exactly the person the feature exists for. 120/hour leaves generous headroom for
   * genuine reading while still bounding a scripted caller.
   *
   * Cache hits are NOT charged against this — only calls that would actually reach the
   * model. A second visitor reading the same page spends nothing and consumes nothing.
   */
  TRANSLATE_PER_IP: { limit: 120, windowSeconds: 60 * 60 },

  /**
   * GLOBAL daily ceiling on model-backed translations — the spend cap.
   *
   * /api/translate is UNAUTHENTICATED and calls a paid API, which makes it a
   * translation proxy funded by the school unless something bounds the total. Per-IP limits
   * alone do not: an attacker with a pool of addresses simply spreads the load.
   *
   * Modelled on ENROLLMENT_EMAIL_GLOBAL_PER_DAY above, including its most important
   * property: ON TRIP THE FEATURE DEGRADES, IT DOES NOT ERROR. The endpoint returns the
   * English original and the page renders normally. A visitor loses a convenience; nobody
   * loses a page.
   *
   * 2000/day is far above real reading volume for a school with a handful of enrolled
   * families — the whole public site is only a few hundred translatable blocks, and the
   * permanent cache means each is paid for once ever. If this trips, something is wrong.
   */
  TRANSLATION_GLOBAL_PER_DAY: { limit: 2000, windowSeconds: 24 * 60 * 60 },

  /**
   * Password-change attempts, per signed-in user.
   *
   * The form requires the CURRENT password, which makes it a second place a password can be
   * guessed — and a more attractive one than the login form, because reaching it means an
   * attacker already has a session (a borrowed laptop, a shared machine left signed in) and
   * only needs the password to lock the real owner out permanently.
   *
   * Tighter than LOGIN_PER_EMAIL because there is no legitimate reason to get your own
   * current password wrong ten times, and the cost of being wrong is a short wait.
   */
  PASSWORD_CHANGE_PER_USER: { limit: 5, windowSeconds: 15 * 60 },
} as const;
