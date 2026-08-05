"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { coerceLocale, LOCALE_COOKIE } from "../i18n/locales";
import { isProduction } from "../env";

/**
 * SETTING THE LANGUAGE
 * =============================================================================
 * A server action rather than a client component with an onChange, because the
 * enrollment funnel's core promise is that it works with JavaScript disabled. The toggle
 * is a plain <form> with one submit button per language; this writes the cookie and sends
 * the visitor back to the page they were on.
 *
 * A `?lang=` link would have been simpler and does not work: a Server Component cannot
 * write a cookie during render, so following such a link could change the display once but
 * never persist the choice.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO PIECES OF UNTRUSTED INPUT, BOTH VALIDATED
 *
 * 1. `lang` — narrowed by coerceLocale, because it is about to index the message
 *    catalogue. Anything unrecognised silently becomes English rather than erroring; a
 *    bad language cookie must not be able to break the enrollment form.
 *
 * 2. `returnTo` — THIS IS AN OPEN REDIRECT IF UNCHECKED. It arrives in a form field, so a
 *    crafted page could point it at an attacker's site and use the school's own domain to
 *    launder a phishing hop. Only same-origin absolute paths are accepted, and anything
 *    else falls back to /enroll.
 *
 * This action is deliberately UNAUTHENTICATED — prospective families are anonymous — and
 * deliberately NOT rate limited: it writes no database row, sends no email, and costs a
 * cookie. Adding a limiter here could only lock a real family out of reading the form in
 * their own language.
 */

/** Where to send a visitor whose `returnTo` we will not honour. */
const FALLBACK: Route = "/enroll";

/**
 * Accepts only a same-origin absolute path.
 *
 * The `//` rejection is the one that is easy to miss: `//evil.example` is a
 * PROTOCOL-RELATIVE URL, so it passes a naive `startsWith("/")` check and then navigates
 * off-site. A backslash is rejected too, because some clients normalise `/\` to `//`.
 */
function safeReturnTo(value: unknown): Route {
  if (typeof value !== "string") return FALLBACK;
  if (!value.startsWith("/")) return FALLBACK;
  if (value.startsWith("//") || value.startsWith("/\\")) return FALLBACK;
  // No scheme, no host, no control characters.
  if (/[\r\n\t]/.test(value) || value.includes("://")) return FALLBACK;

  /**
   * ⚠️  REJECT TRAVERSAL BEFORE THE PREFIX CHECK, NOT AFTER.
   *
   * `/enroll/../admin` passes a `startsWith("/enroll")` test and then a browser
   * NORMALISES it to `/admin` when resolving the Location header — so the prefix check
   * below is worthless without this. Caught by a test that was itself too weak: it
   * asserted only "does not leave the site", which this does not, and so it passed while
   * escaping the funnel entirely.
   *
   * Encoded forms are rejected too. Percent-decoding happens somewhere downstream of us,
   * so `%2e%2e` must never be treated as ordinary path characters here.
   */
  if (value.includes("..") || /%2e/i.test(value)) return FALLBACK;

  /**
   * Scoped to the enrollment funnel, which is the only translated area. Narrow by
   * intent rather than by "anything internal": if the toggle ever appears elsewhere,
   * widening this is a deliberate one-line edit rather than an accident.
   *
   * The trailing check on the next character stops `/enrollment-elsewhere` from passing
   * as though it were inside `/enroll`.
   */
  const rest = value.slice("/enroll".length);
  if (!value.startsWith("/enroll")) return FALLBACK;
  if (rest !== "" && !rest.startsWith("/") && !rest.startsWith("?")) return FALLBACK;

  // The single cast. `value` has been checked to be an internal enrollment path, which
  // typedRoutes cannot infer from a runtime string.
  return value as Route;
}

export async function setLanguageAction(formData: FormData): Promise<void> {
  const locale = coerceLocale(formData.get("lang"));
  const returnTo = safeReturnTo(formData.get("returnTo"));

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    /**
     * httpOnly even though this is only a preference: nothing client-side reads it, and
     * a cookie no script can touch is one fewer thing an XSS foothold can rewrite.
     */
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    // A year. A family's language does not change between visits, and expiring it would
    // silently drop them back into English mid-application.
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(returnTo);
}
