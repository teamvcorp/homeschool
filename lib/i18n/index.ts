import { DEFAULT_LOCALE, type Locale } from "./locales";
import en, { type MessageKey } from "./messages/en";
import es from "./messages/es";
import lo from "./messages/lo";

/**
 * TRANSLATION LOOKUP
 * =============================================================================
 * No i18n library. This is a typed record and a string replace, and adding
 * next-intl or i18next would bring routing opinions, a provider, and a bundle cost for
 * something a page of code covers. Same reasoning as lib/email/send.ts talking to Resend
 * over fetch instead of installing the SDK.
 *
 * Client-importable (no `server-only`): the signing form is a Client Component and needs
 * to render translated labels. Nothing secret lives here.
 *
 * `getLocale()` for reading the visitor's choice is in ./server.ts, which IS server-only
 * because it touches cookies.
 */

const CATALOGUES: Record<Locale, Record<string, string>> = { en, es, lo };

export type { MessageKey };
export type { Locale };

/**
 * Looks up a message and substitutes `{placeholder}` values.
 *
 * FALLS BACK TO ENGLISH rather than rendering a raw key. The `satisfies` clause in each
 * catalogue makes a missing key a compile error, so in principle this cannot happen — but
 * "in principle" is doing a lot of work when the alternative is a parent receiving an
 * email that says `email.accepted.body1`. Defensive by design.
 *
 * Placeholders left unsubstituted are ALSO a bug worth seeing, so an unknown placeholder
 * is left visibly intact rather than silently blanked.
 */
export function t(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const catalogue = CATALOGUES[locale] ?? CATALOGUES[DEFAULT_LOCALE];
  const template = catalogue[key] ?? CATALOGUES[DEFAULT_LOCALE][key];

  if (template === undefined) {
    // Genuinely unreachable while the types hold. Loud, not silent.
    console.error(`[i18n] missing message key "${key}" in all catalogues`);
    return key;
  }

  if (!vars) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

/**
 * A `t` bound to one locale, so a component or template does not repeat it on every call.
 *
 *     const tr = translator(locale);
 *     tr("email.accepted.heading", { studentName });
 */
export function translator(locale: Locale) {
  return (key: MessageKey, vars?: Record<string, string | number>) =>
    t(locale, key, vars);
}

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, LOCALE_LABELS, LOCALE_HTML_LANG, LOCALE_COOKIE, isLocale, coerceLocale } from "./locales";
