import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getClientIp } from "@/lib/audit";
import { consumeRateLimit, hashIdentifier, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { translate, MAX_SOURCE_CHARS } from "@/lib/translate/service";
import { normalizeForHash } from "@/lib/translate/cache";
import {
  ACKNOWLEDGMENT_LIST,
  AGREEMENT_PREAMBLE,
  SIGNATURE_ATTESTATION,
} from "@/lib/enrollment/agreement-text";

/**
 * ON-DEMAND TRANSLATION ENDPOINT
 * =============================================================================
 * Backs the language lens on the public marketing pages. Given a paragraph and a target
 * language, returns a translation — from cache where possible, from the model otherwise.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS ENDPOINT SPENDS MONEY, AND IT IS UNAUTHENTICATED
 *
 * That combination is the whole security story. Left open it is a translation proxy funded
 * by the school, so five things fence it, in this order:
 *
 *   1. POST only, same-origin. Rejects the trivial cross-site call.
 *   2. Length cap. Bounds the cost of any single request.
 *   3. THE AGREEMENT GUARD (below). Refuses enrollment-agreement text outright.
 *   4. Per-IP rate limit. Bounds one caller.
 *   5. A global daily cap inside the service. Bounds everyone — the only control that
 *      actually caps the bill, since per-IP limits are defeated by an address pool.
 *
 * Plus the cache, which means repeated text is free and a novel-text attacker pays once
 * per distinct string rather than once per request.
 *
 * ⚠️  EVERY FAILURE PATH RETURNS 200 WITH `translation: null`. The lens is a reading aid;
 * a rate-limited or capped visitor sees the English original, which is fine. Returning an
 * error status would make a marketing page look broken over a missing convenience.
 * The two exceptions are genuinely malformed requests (400) and wrong-origin (403), where
 * there is no reader to degrade gracefully for.
 */

/** Route handlers are dynamic by default; stated explicitly because it is load-bearing. */
export const dynamic = "force-dynamic";

/**
 * THE AGREEMENT GUARD.
 *
 * The enrollment agreement is never machine-translated. `agreementHash()` covers the
 * ENGLISH wording, that digest is what every signature attests to, and
 * scripts/check-agreement-hash.ts pins it — a family must never read a machine rendering of
 * terms they are about to sign, and this endpoint must not become a way to produce one.
 *
 * The funnel is already out of scope structurally (the lens refuses to activate under
 * /enroll), but structure is a UI decision and this is an open HTTP endpoint. Anyone can
 * POST the acknowledgments to it directly. So the refusal is enforced here, on content,
 * where it cannot be routed around.
 *
 * Built once at module load from the same source the signing screen renders.
 */
const AGREEMENT_TEXTS: ReadonlySet<string> = new Set(
  [
    AGREEMENT_PREAMBLE,
    SIGNATURE_ATTESTATION,
    ...ACKNOWLEDGMENT_LIST.map((a) => a.text),
  ].map(normalizeForHash),
);

function isAgreementText(normalized: string): boolean {
  if (AGREEMENT_TEXTS.has(normalized)) return true;
  /**
   * Also catch a paragraph that CONTAINS an acknowledgment — someone pasting the block, or
   * a future component that wraps one in surrounding prose. Exact-match alone would be
   * trivially defeated by a leading space or a trailing sentence.
   */
  for (const text of AGREEMENT_TEXTS) {
    if (text.length > 40 && normalized.includes(text)) return true;
  }
  return false;
}

/** Same-origin only. Mirrors the CSRF posture the enrollment server actions already take. */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  // A same-origin fetch from a browser always sets Origin on POST.
  if (!origin) return false;
  try {
    const allowed = new URL(env.NEXT_PUBLIC_SITE_URL).origin;
    if (origin === allowed) return true;
  } catch {
    // Malformed NEXT_PUBLIC_SITE_URL — fall through to the request-host comparison.
  }
  return origin === new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not accepted" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const { text, locale } = (body ?? {}) as { text?: unknown; locale?: unknown };

  if (typeof text !== "string" || typeof locale !== "string") {
    return NextResponse.json({ error: "Expected { text, locale }" }, { status: 400 });
  }
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  }
  if (locale === DEFAULT_LOCALE) {
    // Nothing to do — the page is already English. Not an error, just a no-op.
    return NextResponse.json({ translation: null, reason: "already-english" });
  }
  if (text.length > MAX_SOURCE_CHARS) {
    return NextResponse.json(
      { error: `Text exceeds ${MAX_SOURCE_CHARS} characters` },
      { status: 400 },
    );
  }

  const normalized = normalizeForHash(text);
  if (!normalized) {
    return NextResponse.json({ translation: null, reason: "empty" });
  }

  if (isAgreementText(normalized)) {
    console.warn("[translate] refused: enrollment agreement text");
    return NextResponse.json(
      {
        translation: null,
        reason: "not-translatable",
        detail:
          "The enrollment agreement is not machine-translated. Its English wording is the agreement.",
      },
      { status: 422 },
    );
  }

  /**
   * Per-IP limit. Charged before the model call but AFTER the cheap rejections, so a
   * malformed or out-of-scope request never spends a caller's budget.
   *
   * A missing IP falls back to one shared bucket rather than skipping the limiter — on a
   * differently-proxied deployment, skipping would leave this endpoint unmetered.
   */
  /**
   * Wrapped, and fails closed, for the same reason as the global cap in the service: this
   * touches MongoDB, and an Atlas timeout used to throw past the handler and 500 the
   * request. A limiter that cannot be consulted must not wave traffic through to a paid API.
   */
  try {
    const ip = await getClientIp();
    const limit = await consumeRateLimit(
      `translate:ip:${hashIdentifier(ip ?? "unknown-proxy-misconfigured")}`,
      RATE_LIMITS.TRANSLATE_PER_IP.limit,
      RATE_LIMITS.TRANSLATE_PER_IP.windowSeconds,
    );
    if (!limit.allowed) {
      // 200, not 429: the reader loses a convenience, not the page.
      return NextResponse.json({ translation: null, reason: "rate-limited" });
    }
  } catch (error) {
    console.error("[translate] rate limiter unavailable; declining to translate", error);
    return NextResponse.json({ translation: null, reason: "unavailable" });
  }

  /**
   * Final backstop. `translate()` is written not to throw, but this endpoint's promise is
   * that a reader never sees an error where a paragraph should be — and a promise that
   * depends on every callee keeping its own promise is one refactor away from being false.
   */
  try {
    const result = await translate(text, locale);
    if (result.status === "ok") {
      return NextResponse.json({ translation: result.translation, cached: result.cached });
    }
    return NextResponse.json({ translation: null, reason: result.reason });
  } catch (error) {
    console.error("[translate] unexpected failure escaped the service", error);
    return NextResponse.json({ translation: null, reason: "failed" });
  }
}

/**
 * Declared so the intent is explicit: translation is a POST because it carries a body, and
 * a GET must not be triggerable by a crawler, a link preview, or a browser address bar.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Use POST with { text, locale }" },
    { status: 405 },
  );
}
