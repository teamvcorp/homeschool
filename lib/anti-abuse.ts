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
 * Minimum plausible time between a form being served and submitted.
 *
 * APPLIED ONLY TO THE FINAL SUBMIT, never to a wizard step save. See the reasoning in
 * checkPublicFormAbuse: a family using browser autofill can legitimately complete the
 * guardian step in well under two seconds (click a field, accept the autofill dropdown,
 * click Save), and rejecting them costs the school an enrollment. The final signature step
 * necessarily follows a review page and requires typing a full legal name, so a
 * sub-two-second submit there really is a script.
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

function verifyFormTimestamp(
  value: unknown,
  enforceMinFillTime: boolean,
): { ok: boolean; reason?: string } {
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
  // Only the final submit enforces a floor — see the note on MIN_FILL_MS.
  if (enforceMinFillTime && age < MIN_FILL_MS) {
    return { ok: false, reason: "too-fast" };
  }
  if (age > MAX_FORM_AGE_MS) return { ok: false, reason: "stale" };

  return { ok: true };
}

export interface AbuseCheckResult {
  ok: boolean;
  /** Message safe to show a visitor. Never explains which check tripped. */
  message?: string;
}

/**
 * Runs the abuse checks for a public form submission.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE GOVERNING PRINCIPLE, learned from breaking this in production:
 *
 * A FALSE REJECTION COSTS MORE THAN A TOLERATED BOT.
 *
 * This form is how the school enrolls students. A family part-way through a legally
 * significant agreement who gets told "we could not process that" may simply give up, and
 * the school never knows they tried. Meanwhile the worst a bot achieves against a wizard
 * STEP is a disposable draft record that TTL-expires in 14 days.
 *
 * So the checks are asymmetric by design:
 *   - Step saves get the cheap, false-positive-free checks (checkbox honeypot, signature
 *     validity, staleness) plus a generous rate limit. No minimum fill time.
 *   - The final submit — the expensive, irreversible action that creates an application and
 *     sends email — additionally enforces the minimum fill time and a tight rate limit.
 *
 * The visitor-facing message stays vague and identical across the adversarial failure modes
 * so an attacker gets no debugging oracle. Every branch console.warns a distinct string so
 * the school CAN diagnose it — that is how the autofill bug was found:
 *   [anti-abuse] honeypot filled on enroll-step
 */
export async function checkPublicFormAbuse(
  formData: FormData,
  policy: { limit: number; windowSeconds: number },
  scope: string,
  options: {
    /** Usually the guardian's email, for a per-person limit on top of per-IP. */
    identifier?: string;
    /**
     * Enforce the minimum fill time. TRUE only for a final submit. Enabling it for step
     * saves is what would reject a family who uses browser autofill.
     */
    enforceMinFillTime?: boolean;
  } = {},
): Promise<AbuseCheckResult> {
  const { identifier, enforceMinFillTime = false } = options;

  const genericFailure: AbuseCheckResult = {
    ok: false,
    message:
      "We could not process that submission. Please reload the page and try again — or call the school and we will take your details directly.",
  };

  /**
   * 1. Honeypot.
   *
   * A CHECKBOX (see app/components/forms/SubmitButton.tsx). An unchecked checkbox submits
   * no value at all, so the only way this is present is if something ticked it — which
   * browser autofill does not do. The previous text-input version was filled by Chrome and
   * Edge address-autofill and rejected real families.
   */
  const honeypot = formData.get(HONEYPOT_FIELD);
  if (honeypot !== null && String(honeypot).trim() !== "") {
    console.warn(`[anti-abuse] honeypot ticked on ${scope}`);
    return genericFailure;
  }

  // 2. Signed timing check. The minimum-fill floor applies only where requested.
  const timing = verifyFormTimestamp(
    formData.get(TIMESTAMP_FIELD),
    enforceMinFillTime,
  );
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
