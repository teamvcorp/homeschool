import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";
import { consumeRateLimit, RATE_LIMITS } from "../auth/rate-limit";
import type { Locale } from "../i18n/locales";
import { contentHash, readCache, writeCache, normalizeForHash } from "./cache";
import { systemPrompt, userPrompt, TRANSLATION_SCHEMA } from "./prompt";

/**
 * ON-DEMAND TRANSLATION
 * =============================================================================
 * Cache first, then the model, then store. Everything about this file is arranged around
 * one rule:
 *
 *   ⚠️  THIS FEATURE DEGRADES, IT NEVER FAILS THE PAGE.
 *
 * A missing API key, a tripped spend cap, a model timeout, a database outage — every one of
 * them returns "no translation available" and the reader sees the English original, which
 * is a perfectly good outcome. None of them throws. The language lens is a reading aid; a
 * marketing page must never break because an aid was unavailable.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MODEL CHOICE
 *
 * claude-opus-5. Translation quality into Lao is exactly where a stronger model earns its
 * price, and because the cache makes each paragraph a one-time cost, the difference across
 * the whole site is roughly $0.90 versus $0.18 — not a number worth trading quality for.
 * Switching to claude-haiku-4-5 is a one-line change if that ever stops being true.
 *
 * NO PROMPT CACHING. Every request carries different text, so only the system prompt could
 * cache, and it is far below the 512-token minimum — a `cache_control` marker here would
 * silently do nothing. The translation cache above is the real cost lever.
 */

const MODEL = "claude-opus-5";

/** Paragraph-sized. Generous enough for the longest block on the site, small enough to bound a runaway. */
const MAX_TOKENS = 2048;

/**
 * Hard ceiling on a single request's input.
 *
 * Two jobs: it bounds per-call cost, and it stops the endpoint being used to translate
 * something that plainly is not a paragraph of our website copy.
 */
export const MAX_SOURCE_CHARS = 4000;

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export type TranslateOutcome =
  | { status: "ok"; translation: string; cached: boolean }
  /** Everything the caller should treat identically: show the English. */
  | { status: "unavailable"; reason: "not-configured" | "capped" | "failed" };

/**
 * Translates one passage, or explains why it could not.
 *
 * The rate limiting that belongs to the *caller* (per-IP) lives in the route handler. The
 * GLOBAL spend cap lives here, deliberately: it is a property of the service itself, and
 * putting it here means it cannot be bypassed by a future second call site.
 */
export async function translate(
  text: string,
  target: Locale,
): Promise<TranslateOutcome> {
  const source = normalizeForHash(text);
  if (!source) return { status: "unavailable", reason: "failed" };

  const hash = contentHash(source, target);

  /**
   * Cache first, and BEFORE the spend cap is consulted. A cached paragraph costs nothing,
   * so a tripped cap must not stop us serving it — otherwise one busy day would black out
   * translations the school has already paid for.
   */
  const cached = await readCache(hash);
  if (cached) return { status: "ok", translation: cached, cached: true };

  const anthropic = getClient();
  if (!anthropic) return { status: "unavailable", reason: "not-configured" };

  /**
   * GLOBAL DAILY SPEND CAP.
   *
   * /api/translate is unauthenticated and calls a paid API, which makes it a translation
   * proxy funded by the school unless something bounds the total. Per-IP limits do not:
   * an attacker with a pool of addresses spreads the load across them. Only a global
   * counter caps the bill.
   *
   * Charged here, after the cache check, so it only ever counts calls that actually reach
   * the model. Mirrors ENROLLMENT_EMAIL_GLOBAL_PER_DAY in lib/auth/rate-limit.ts.
   */
  /**
   * ⚠️  FAILS CLOSED, AND IS WRAPPED.
   *
   * Both halves were bugs found by the harness. `consumeRateLimit` talks to MongoDB, and an
   * Atlas connection timeout threw straight out of this function and past the route, turning
   * a transient network blip into a 500 on a marketing page — precisely the outcome the
   * invariant at the top of this file forbids.
   *
   * When the counter cannot be read, we do NOT call the model. The global cap is the only
   * control that actually bounds the bill, so spending money without being able to count it
   * is the wrong side to fail on. A reader sees the English; nobody sees an error.
   */
  let budget: { allowed: boolean };
  try {
    budget = await consumeRateLimit(
      "translate:global",
      RATE_LIMITS.TRANSLATION_GLOBAL_PER_DAY.limit,
      RATE_LIMITS.TRANSLATION_GLOBAL_PER_DAY.windowSeconds,
    );
  } catch (error) {
    console.error(
      "[translate] could not consult the spend cap; refusing to call the model",
      error,
    );
    return { status: "unavailable", reason: "failed" };
  }

  if (!budget.allowed) {
    console.error(
      `[translate] GLOBAL DAILY CAP REACHED (${RATE_LIMITS.TRANSLATION_GLOBAL_PER_DAY.limit}). Serving English. Investigate before raising it — real reading volume should not approach this.`,
    );
    return { status: "unavailable", reason: "capped" };
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      /**
       * Adaptive thinking at low effort rather than thinking disabled.
       *
       * Disabling thinking on this model has two documented failure modes, one of which —
       * `<thinking>` tags leaking into the visible response — would put raw markup straight
       * into a paragraph a family is reading. Low effort is the cheaper lever anyway, and
       * translation is not a task that needs deep reasoning.
       */
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        /**
         * Constrains the response SHAPE. Removes the everyday failure of a conversational
         * preamble ("Here is the translation:") becoming part of the rendered paragraph,
         * and means a prompt-injection attempt cannot restructure the reply.
         */
        format: { type: "json_schema", schema: TRANSLATION_SCHEMA },
      },
      system: systemPrompt(),
      messages: [{ role: "user", content: userPrompt(source, target) }],
    });

    /**
     * Safety classifiers can decline a request — a 200 with stop_reason "refusal" and
     * possibly empty content. Check before reading content, or this throws on an index.
     */
    if (response.stop_reason === "refusal") {
      console.warn("[translate] request refused by safety classifiers");
      return { status: "unavailable", reason: "failed" };
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { status: "unavailable", reason: "failed" };
    }

    const translation = extractTranslation(textBlock.text);
    if (!translation) return { status: "unavailable", reason: "failed" };

    await writeCache({
      hash,
      sourceText: source,
      targetLocale: target,
      translatedText: translation,
      model: MODEL,
    });

    return { status: "ok", translation, cached: false };
  } catch (error) {
    /**
     * Typed SDK errors, but every branch has the same outcome for the reader, so they are
     * distinguished only in the log. Rate limits and overloads are the ones worth seeing
     * separately, because they mean "try later" rather than "something is wrong".
     */
    if (error instanceof Anthropic.RateLimitError) {
      console.warn("[translate] provider rate limit");
    } else if (error instanceof Anthropic.APIError) {
      console.error(`[translate] API error ${error.status}: ${error.message}`);
    } else {
      console.error("[translate] unexpected failure", error);
    }
    return { status: "unavailable", reason: "failed" };
  }
}

/**
 * Pulls the translation out of the model's reply.
 *
 * The schema should guarantee JSON, but this parses defensively and falls back to the raw
 * text: a structured-output change or an unexpected reply shape should cost us a slightly
 * scruffy translation, not a blank paragraph.
 */
function extractTranslation(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "translation" in parsed &&
      typeof (parsed as { translation: unknown }).translation === "string"
    ) {
      const value = (parsed as { translation: string }).translation.trim();
      return value || null;
    }
  } catch {
    // Not JSON — fall through and use the text as-is.
  }

  return trimmed;
}
