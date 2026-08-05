import "server-only";
import { consumeRateLimit, hashIdentifier } from "./auth/rate-limit";
import { getClientIp } from "./audit";
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from "./forms/fields";
import {
  signWithFormSecret,
  verifyWithFormSecret,
  splitSignedToken,
} from "./forms/hmac";

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
 * Layers 1–2 are the "fingerprint" phase and never touch the database. Layer 3 is a
 * separate call ON PURPOSE — see checkFormFingerprint / consumeFormRateLimit below.
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
 * APPLIED ONLY TO THE FINAL SUBMIT, never to a wizard step save. A family using browser
 * autofill can legitimately complete the guardian step in well under two seconds (click a
 * field, accept the autofill dropdown, click Save), and rejecting them costs the school an
 * enrollment. The final signature step necessarily follows a review page and requires
 * typing a full legal name, so a sub-two-second submit there really is a script.
 *
 * BE HONEST ABOUT WHAT THIS BUYS: the token is not single-use and is not bound to a
 * draft, IP, or step, so it is replayable for its whole 12-hour validity. The floor
 * therefore delays an attacker once per token, not once per request. It stops the
 * trivial "POST immediately with a scraped form" script and nothing more sophisticated.
 * That is precisely why relaxing it on step saves gives up almost no abuse resistance
 * while removing a whole class of false rejection.
 */
const MIN_FILL_MS = 2000;

/** Maximum age of a served form. Beyond this the page was left open for half a day. */
const MAX_FORM_AGE_MS = 1000 * 60 * 60 * 12;

export interface RateLimitPolicy {
  limit: number;
  windowSeconds: number;
}

export interface AbuseCheckResult {
  ok: boolean;
  /** Message safe to show a visitor. Never explains which adversarial check tripped. */
  message?: string;
}

/**
 * The visitor-facing message for every adversarial failure mode.
 *
 * Deliberately identical across honeypot / missing / forged / malformed / too-fast so an
 * attacker gets no oracle to tune against. Every branch console.warns a DISTINCT string
 * server-side, which is what the school actually diagnoses from — that is how the autofill
 * bug was found. Do not add a machine-readable reason code to the response: it would hand
 * an attacker a free tuning loop for zero operational benefit, since the school reads logs,
 * not HTTP bodies.
 */
const GENERIC_FAILURE: AbuseCheckResult = {
  ok: false,
  message:
    "We could not process that submission. Please reload the page and try again — or call the school and we will take your details directly.",
};

/* ------------------------------ signed timestamp ---------------------------- */

/**
 * Issues a signed timestamp to embed in a form.
 *
 * Signed rather than raw so a bot cannot simply post a plausible older timestamp to
 * defeat the timing check.
 */
export function issueFormTimestamp(): string {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${signWithFormSecret(issuedAt)}`;
}

function verifyFormTimestamp(
  value: unknown,
  enforceMinFillTime: boolean,
): { ok: boolean; reason?: string } {
  const token = splitSignedToken(value);
  if (!token) return { ok: false, reason: "missing" };

  if (!verifyWithFormSecret(token.payload, token.signature)) {
    return { ok: false, reason: "forged" };
  }

  const issuedAt = Number.parseInt(token.payload, 10);
  if (Number.isNaN(issuedAt)) return { ok: false, reason: "malformed" };

  const age = Date.now() - issuedAt;
  // Only the final submit enforces a floor — see the note on MIN_FILL_MS.
  if (enforceMinFillTime && age < MIN_FILL_MS) {
    return { ok: false, reason: "too-fast" };
  }
  if (age > MAX_FORM_AGE_MS) return { ok: false, reason: "stale" };

  return { ok: true };
}

/* --------------------------- phase 1: fingerprint --------------------------- */

/**
 * The free checks: honeypot and signed timing. NO DATABASE ACCESS, so this is safe to
 * run before anything expensive and it consumes none of the caller's budget.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE GOVERNING PRINCIPLE, learned from breaking this in production:
 *
 * A FALSE REJECTION COSTS MORE THAN A TOLERATED BOT.
 *
 * This form is how the school enrolls students. A family part-way through a legally
 * significant agreement who gets told "we could not process that" may simply give up, and
 * the school never knows they tried. Meanwhile the worst a bot achieves against a wizard
 * STEP is a disposable draft record that TTL-expires.
 */
export function checkFormFingerprint(
  formData: FormData,
  scope: string,
  options: {
    /**
     * Enforce the minimum fill time. TRUE only for a final submit. Enabling it for step
     * saves is what would reject a family who uses browser autofill.
     */
    enforceMinFillTime?: boolean;
  } = {},
): AbuseCheckResult {
  const { enforceMinFillTime = false } = options;

  /**
   * 1. Honeypot.
   *
   * A CHECKBOX (see app/components/forms/SubmitButton.tsx). An unchecked checkbox submits
   * no value at all, so the only way this key is present is if something ticked it — which
   * browser autofill does not do. The previous text-input version was filled by Chrome and
   * Edge address-autofill and rejected real families.
   *
   * The String() coercion is deliberate: a `File` value (someone POSTing multipart junk)
   * stringifies to "[object File]" and is correctly treated as a hit, because no
   * legitimate client sends a file for this field.
   */
  const honeypot = formData.get(HONEYPOT_FIELD);
  if (honeypot !== null && String(honeypot).trim() !== "") {
    console.warn(`[anti-abuse] honeypot ticked on ${scope}`);
    return GENERIC_FAILURE;
  }

  // 2. Signed timing check. The minimum-fill floor applies only where requested.
  const timing = verifyFormTimestamp(
    formData.get(TIMESTAMP_FIELD),
    enforceMinFillTime,
  );
  if (!timing.ok) {
    console.warn(`[anti-abuse] timestamp ${timing.reason} on ${scope}`);

    /**
     * A stale form is the one benign case worth explaining, since the fix is simply
     * reloading and it would otherwise look broken.
     *
     * The wording says "re-enter this step" on purpose. Reaching this branch means the
     * save was REJECTED, so whatever was typed into the current step is gone — only
     * previously-saved steps survive. Telling a family their "progress is intact" while
     * their whole address block has just been discarded is a small lie that produces a
     * support call.
     */
    if (timing.reason === "stale") {
      return {
        ok: false,
        message:
          "This form was left open for a while and has expired. Please reload the page and re-enter this step — anything you saved earlier is still there.",
      };
    }
    return GENERIC_FAILURE;
  }

  return { ok: true };
}

/* --------------------------- phase 2: rate limits --------------------------- */

/**
 * The database-backed counters. Separated from the fingerprint phase so a caller can
 * choose WHEN a request consumes budget.
 *
 * ⚠️  WHY THE SEPARATION EXISTS — DO NOT COLLAPSE THESE BACK INTO ONE CALL FOR THE SUBMIT.
 *
 * When the submit limiter ran before schema validation, every rejected POST burned a slot
 * out of a 6-per-hour budget. A family enrolling four children who twice forget to tick
 * the intent box hits the cap on a genuine, fully-typed agreement and is told to "call the
 * school" mid-signature. That is a false rejection, i.e. the exact bug class this module's
 * governing principle forbids. The tight limiter now runs only once a COMPLETE, VALID
 * agreement is in hand, so a mistake costs nothing and only real applications count.
 *
 * A generous pre-validation limiter (see ENROLL_SUBMIT_ATTEMPT_PER_IP) keeps that from
 * becoming an unmetered loop.
 */
export async function consumeFormRateLimit(
  scope: string,
  options: {
    ipPolicy: RateLimitPolicy;
    /** Usually the guardian's email, for a per-person limit on top of per-IP. */
    identifier?: string;
    /**
     * Policy for the identifier key. REQUIRED whenever `identifier` is set.
     *
     * This used to be a single `policy` applied to BOTH keys, which meant the per-email
     * cap was silently whatever the per-IP cap happened to be, and
     * RATE_LIMITS.ENROLL_SUBMIT_PER_EMAIL was dead config documenting protection that did
     * not exist. Two keys with two different jobs get two explicit policies.
     */
    identifierPolicy?: RateLimitPolicy;
  },
): Promise<AbuseCheckResult> {
  const { ipPolicy, identifier, identifierPolicy } = options;

  /**
   * A missing client IP means no proxy header reached us.
   *
   * On Vercel `x-forwarded-for` is always injected, so this is theoretical there — but if
   * this app is ever self-hosted or fronted by a different proxy, silently skipping the
   * limiter would leave draft creation completely unbounded. So we fall back to a single
   * shared "unknown" bucket AND log loudly, because a shared bucket throttles every
   * visitor together and an operator needs to see that immediately.
   *
   * The limits are set generously enough (see lib/auth/rate-limit.ts) that even a fully
   * shared bucket does not reject a real family at this school's volume.
   */
  const ip = await getClientIp();
  if (!ip) {
    console.warn(
      `[anti-abuse] no client IP on ${scope} — rate limiting is degraded to a single shared bucket; check that the proxy sets x-forwarded-for`,
    );
  }

  const ipResult = await consumeRateLimit(
    `${scope}:ip:${hashIdentifier(ip ?? "unknown-proxy-misconfigured")}`,
    ipPolicy.limit,
    ipPolicy.windowSeconds,
  );
  if (!ipResult.allowed) {
    console.warn(`[anti-abuse] ip rate limit hit on ${scope}`);
    return {
      ok: false,
      message:
        "We have received several submissions from your connection recently. Please wait a little while, or call the school and we will help directly.",
    };
  }

  if (identifier && identifierPolicy) {
    const idResult = await consumeRateLimit(
      `${scope}:id:${hashIdentifier(identifier)}`,
      identifierPolicy.limit,
      identifierPolicy.windowSeconds,
    );
    if (!idResult.allowed) {
      console.warn(`[anti-abuse] identifier rate limit hit on ${scope}`);
      return {
        ok: false,
        message:
          "We already have several recent submissions for this email address. If you are enrolling more children, or need to change something, please call the school and we will finish it with you directly.",
      };
    }
  }

  return { ok: true };
}

/* ------------------------------ combined helper ----------------------------- */

/**
 * Fingerprint + rate limit in one call, for forms where there is nothing between the
 * two worth deferring for — a single-page enquiry form, for example.
 *
 * The enrollment SUBMIT deliberately does NOT use this: it calls the two phases
 * separately so that a schema failure never consumes application budget. See the warning
 * on consumeFormRateLimit.
 */
export async function checkPublicFormAbuse(
  formData: FormData,
  scope: string,
  options: {
    ipPolicy: RateLimitPolicy;
    identifier?: string;
    identifierPolicy?: RateLimitPolicy;
    enforceMinFillTime?: boolean;
  },
): Promise<AbuseCheckResult> {
  const fingerprint = checkFormFingerprint(formData, scope, {
    enforceMinFillTime: options.enforceMinFillTime,
  });
  if (!fingerprint.ok) return fingerprint;

  return consumeFormRateLimit(scope, options);
}
