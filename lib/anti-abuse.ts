import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";
import { consumeRateLimit, hashIdentifier } from "./auth/rate-limit";
import { getClientIp } from "./audit";
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from "./forms/fields";

/**
 * PUBLIC FORM ABUSE CONTROLS
 * =============================================================================
 * The enrollment and enquiry forms are unauthenticated endpoints on a real school
 * website, reachable by direct POST. Nothing here is a substitute for validation and
 * authorization — it exists so that automated abuse is cheap for us and expensive for
 * the sender.
 *
 * Three layers, in increasing cost to evaluate:
 *   1. Honeypot     — free, catches naive form-filling bots
 *   2. Timing check — free, catches instant submissions
 *   3. Rate limit   — one database write, catches everything persistent
 *
 * NO CAPTCHA IN v1. A Turnstile hook point exists (TURNSTILE_* env vars, unset), but
 * adding a CAPTCHA imposes a real accessibility and privacy cost on every family for
 * a site that receives a handful of genuine submissions a week. Add it if abuse
 * actually appears — not preemptively.
 */

// Field names live in lib/forms/fields.ts (no server-only marker) so the client
// form can render the inputs. Re-exported here for server-side convenience.
export { HONEYPOT_FIELD, TIMESTAMP_FIELD };


/**
 * Minimum plausible time to complete a form step, in milliseconds.
 *
 * Two seconds is well below any human filling in a name and address, and well above
 * a script's round trip.
 */
const MIN_FILL_MS = 2000;

/** Maximum age of a served form. Beyond this the page was left open for a day. */
const MAX_FORM_AGE_MS = 1000 * 60 * 60 * 12;

/**
 * Issues a signed timestamp to embed in a form.
 *
 * Signed rather than raw so a bot cannot simply post a plausible older timestamp to
 * defeat the timing check.
 */
export function issueFormTimestamp(): string {
  const issuedAt = Date.now().toString();
  const signature = createHmac("sha256", env.FORM_HMAC_SECRET)
    .update(issuedAt)
    .digest("base64url");
  return `${issuedAt}.${signature}`;
}

function verifyFormTimestamp(value: unknown): { ok: boolean; reason?: string } {
  if (typeof value !== "string" || !value.includes(".")) {
    return { ok: false, reason: "missing" };
  }

  const separator = value.lastIndexOf(".");
  const issuedAt = value.slice(0, separator);
  const provided = value.slice(separator + 1);

  const expected = createHmac("sha256", env.FORM_HMAC_SECRET)
    .update(issuedAt)
    .digest("base64url");

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "forged" };
  }

  const age = Date.now() - Number.parseInt(issuedAt, 10);
  if (Number.isNaN(age)) return { ok: false, reason: "malformed" };
  if (age < MIN_FILL_MS) return { ok: false, reason: "too-fast" };
  if (age > MAX_FORM_AGE_MS) return { ok: false, reason: "stale" };

  return { ok: true };
}

export interface AbuseCheckResult {
  ok: boolean;
  /** Message safe to show a visitor. Never explains which check tripped. */
  message?: string;
}

/**
 * Runs every check for a public form submission.
 *
 * The visitor-facing message is deliberately vague and identical across failure
 * modes. Telling a bot author "honeypot triggered" versus "too fast" hands them a
 * free debugging oracle; a real human who somehow trips a check gets a message that
 * tells them what to do next (try again, or phone the school).
 */
export async function checkPublicFormAbuse(
  formData: FormData,
  policy: { limit: number; windowSeconds: number },
  scope: string,
  identifier?: string,
): Promise<AbuseCheckResult> {
  const genericFailure: AbuseCheckResult = {
    ok: false,
    message:
      "We could not process that submission. Please reload the page and try again — or call the school and we will take your details directly.",
  };

  // 1. Honeypot — any value at all means it was not a human.
  const honeypot = formData.get(HONEYPOT_FIELD);
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    console.warn(`[anti-abuse] honeypot filled on ${scope}`);
    return genericFailure;
  }

  // 2. Signed timing check.
  const timing = verifyFormTimestamp(formData.get(TIMESTAMP_FIELD));
  if (!timing.ok) {
    console.warn(`[anti-abuse] timestamp ${timing.reason} on ${scope}`);
    // A stale form is the one benign case worth explaining, since the fix is
    // simply reloading and it will otherwise look broken to a real family.
    if (timing.reason === "stale") {
      return {
        ok: false,
        message:
          "This form was left open for a while and has expired. Please reload the page — your saved progress is intact.",
      };
    }
    return genericFailure;
  }

  // 3. Rate limit, per IP and optionally per identifier (usually email).
  const ip = await getClientIp();
  if (ip) {
    const result = await consumeRateLimit(
      `${scope}:ip:${hashIdentifier(ip)}`,
      policy.limit,
      policy.windowSeconds,
    );
    if (!result.allowed) {
      return {
        ok: false,
        message:
          "We have received several submissions from your connection recently. Please wait a little while, or call the school and we will help directly.",
      };
    }
  }

  if (identifier) {
    const result = await consumeRateLimit(
      `${scope}:id:${hashIdentifier(identifier)}`,
      policy.limit,
      policy.windowSeconds,
    );
    if (!result.allowed) {
      return {
        ok: false,
        message:
          "We already have a recent submission for this email address. If you need to change something, please call the school rather than submitting again.",
      };
    }
  }

  return { ok: true };
}
