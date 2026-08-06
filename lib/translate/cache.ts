import "server-only";
import { createHash } from "node:crypto";
import { translationsCollection } from "../db/collections";
import type { Locale } from "../i18n/locales";

/**
 * THE TRANSLATION CACHE
 * =============================================================================
 * This is not an optimisation. It is the reason the language lens is affordable.
 *
 * Without it, every visitor who taps a paragraph pays for a fresh model call and the cost
 * of the feature scales with traffic. With it, each distinct paragraph is translated ONCE,
 * EVER — the second reader of a page pays nothing, and the steady-state cost of the whole
 * feature is zero once the site has been read through in each language.
 *
 * There is deliberately NO TTL. Every other cache-shaped collection in this schema expires;
 * this one must not, because an expiry silently converts a one-time cost back into a
 * recurring one.
 */

/**
 * Normalises text before hashing.
 *
 * Collapsing whitespace matters more than it looks: the same paragraph arrives with
 * different whitespace depending on how the browser serialises the DOM (line wrapping,
 * indentation in the source JSX, a stray non-breaking space from an `&nbsp;`). Hashing the
 * raw string would produce a cache MISS for text we have already paid to translate —
 * quietly turning the one-time cost back into a per-visitor one, which is the single most
 * expensive mistake this file can make.
 */
export function normalizeForHash(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** The cache key: normalised source plus target locale. */
export function contentHash(text: string, target: Locale): string {
  return createHash("sha256")
    .update(`${normalizeForHash(text)}:${target}`, "utf8")
    .digest("hex");
}

/** Returns a cached translation, or null. Never throws — a cache miss must not break a page. */
export async function readCache(hash: string): Promise<string | null> {
  try {
    const translations = await translationsCollection();
    const hit = await translations.findOne(
      { contentHash: hash },
      { projection: { translatedText: 1 } },
    );
    return hit?.translatedText ?? null;
  } catch (error) {
    // A database blip should degrade to "translate it again", not to a broken page.
    console.error("[translate] cache read failed", error);
    return null;
  }
}

/**
 * Stores a translation.
 *
 * Upsert on the unique `contentHash` index, so two readers tapping the same paragraph at
 * the same moment resolve to one row rather than a duplicate-key error. `$setOnInsert` on
 * `createdAt` keeps the original timestamp when a later write lands on an existing row.
 */
export async function writeCache(input: {
  hash: string;
  sourceText: string;
  targetLocale: Locale;
  translatedText: string;
  model: string;
}): Promise<void> {
  try {
    const translations = await translationsCollection();
    const now = new Date();
    await translations.updateOne(
      { contentHash: input.hash },
      {
        $set: {
          sourceText: input.sourceText,
          targetLocale: input.targetLocale,
          translatedText: input.translatedText,
          model: input.model,
          updatedAt: now,
        },
        $setOnInsert: { contentHash: input.hash, createdAt: now },
      },
      { upsert: true },
    );
  } catch (error) {
    // We already have the translation in hand — failing to cache it costs money next time,
    // but must not cost the reader their paragraph.
    console.error("[translate] cache write failed", error);
  }
}
