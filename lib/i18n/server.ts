import "server-only";
import { cookies } from "next/headers";
import { coerceLocale, LOCALE_COOKIE, type Locale } from "./locales";

/**
 * READING THE VISITOR'S LANGUAGE — SERVER SIDE
 * =============================================================================
 * `server-only` because it touches cookies. Kept apart from ./index.ts so that the
 * client-importable translation helpers do not drag `next/headers` toward the browser.
 */

/**
 * The visitor's chosen locale, or English.
 *
 * ⚠️  `cookies()` IS ASYNC IN NEXT 16 — synchronous access was removed, not merely
 * deprecated. See docs/nextjs-16-conventions.md.
 *
 * ⚠️  THE VALUE IS UNTRUSTED. It is a cookie, so anyone can set it to anything, and it is
 * about to be used to index the message catalogue. `coerceLocale` narrows it to a
 * supported locale or falls back to English; never cast it.
 *
 * ⚠️  DO NOT CALL THIS FROM THE ROOT LAYOUT. `app/layout.tsx` is shared with the
 * marketing pages, which are statically prerendered. Reading a cookie there opts EVERY
 * page out of static generation — the build output would flip from `○` to `ƒ` across the
 * whole site. Call it from the enrollment layout and the funnel pages, which are already
 * dynamic because they read the draft cookie anyway.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return coerceLocale(store.get(LOCALE_COOKIE)?.value);
}
