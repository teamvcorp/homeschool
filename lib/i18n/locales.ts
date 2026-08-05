/**
 * SUPPORTED LANGUAGES
 * =============================================================================
 * Deliberately NOT marked `server-only`: the language toggle and the signing form are
 * Client Components and need the labels and the type.
 *
 * WHY THESE THREE
 * Storm Lake and Buena Vista County are among the most linguistically diverse places in
 * Iowa, largely through the meatpacking industry. Spanish is by far the largest
 * non-English language, and there is a long-established Laotian community. A family that
 * cannot read the enrollment form cannot enroll, and enrollment is this application's
 * entire purpose.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT LANGUAGE CHANGES, AND WHAT IT NEVER CHANGES
 *
 * Translated: the enrollment funnel's own interface — labels, help text, buttons,
 * validation messages, the confirmation page — and the status emails a family receives.
 *
 * NOT translated, on purpose:
 *   - Anything STORED. Status values, enum values, school IDs and generated school email
 *     addresses stay exactly as they are; only their rendering is localised.
 *   - Admin screens and the audit log. Staff and an Iowa DE reviewer read one language,
 *     and a bilingual audit trail is harder to review, not easier.
 *   - The accreditation packet, whose audience is the Iowa Department of Education.
 *   - THE OPERATIVE TEXT OF THE ENROLLMENT AGREEMENT. Translations of the eight
 *     acknowledgments are displayed so a family understands what they are signing, but
 *     the English text remains the agreement and remains what agreementHash() covers.
 *     See lib/enrollment/agreement.ts and scripts/check-agreement-hash.ts.
 */

export const SUPPORTED_LOCALES = ["en", "es", "lo"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie holding the visitor's choice. Not httpOnly — it is a preference, not a secret. */
export const LOCALE_COOKIE = "va_lang";

/**
 * Each language named IN ITSELF.
 *
 * "Spanish" is useless to someone who only reads Spanish — the whole point of a language
 * switcher is to be legible to the person who needs it.
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  lo: "ລາວ",
};

/**
 * BCP 47 tags for the `lang` attribute.
 *
 * Correct values matter beyond politeness: `lang` drives screen-reader pronunciation, and
 * for Lao it drives LINE BREAKING. Lao does not put spaces between words, so a browser
 * that does not know the text is Lao cannot break lines in sensible places.
 */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  en: "en",
  es: "es",
  lo: "lo",
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Narrows untrusted input to a supported locale, falling back to English.
 *
 * The locale arrives from a COOKIE, which is user input. Without this, a crafted value
 * would be used to index the message catalogue — at best rendering `undefined` all over
 * the page, at worst reaching somewhere it should not. Always coerce; never cast.
 */
export function coerceLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
