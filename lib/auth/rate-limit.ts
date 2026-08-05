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
   * Starting an agreement. Very generous: a family enrolling four children in one
   * sitting legitimately triggers this four times, and the action carries no user input
   * worth protecting — the cap exists purely to stop unbounded draft creation by a bot.
   */
  ENROLL_START_PER_IP: { limit: 40, windowSeconds: 60 * 60 },

  /** Final submission — one real application per family per sitting. */
  ENROLL_SUBMIT_PER_IP: { limit: 6, windowSeconds: 60 * 60 },
  ENROLL_SUBMIT_PER_EMAIL: { limit: 4, windowSeconds: 24 * 60 * 60 },

  INQUIRY_PER_IP: { limit: 10, windowSeconds: 60 * 60 },
} as const;
