/**
 * PASSWORD-RESET EMAIL — RENDER CHECK
 * =============================================================================
 *   npm run check:reset-email
 *
 * No database, no server, no network. Renders the template in all three locales and
 * asserts the properties that matter, because the ways this template can be wrong are
 * quiet ones — a reset email that renders "fine" can still be broken:
 *
 *  - A LEAKED CREDENTIAL. The body must contain the reset URL and nothing else
 *    secret. It must never contain a password.
 *  - A MISSING LINK. If the button markup breaks, an HTML reader sees a dead page and
 *    a plain-text reader sees nothing at all. Both formats must carry the URL.
 *  - AN UNESCAPED URL. The token is base64url, which includes `-` and `_` but never
 *    `<` or `&`; a future token format that did would inject markup here.
 *  - THE WRONG `lang`. Lao has no spaces between words, so `lang="lo"` is what makes
 *    line breaking work at all. Getting it wrong produces one unbroken run of text.
 *
 * Sibling of scripts/check-school-email.ts, and the same shape: no test runner, own
 * assertions, non-zero exit on failure.
 */

import { passwordResetEmail } from "../lib/email/templates";
import { SUPPORTED_LOCALES, LOCALE_HTML_LANG } from "../lib/i18n/locales";

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// A realistic token: 32 random bytes base64url is 43 characters.
const TOKEN = "Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MGFiY2RlZmdoaWpr";
const RESET_URL = `https://vaschool.org/reset-password?token=${TOKEN}`;

console.log("\n=== PASSWORD-RESET EMAIL ===\n");

for (const locale of SUPPORTED_LOCALES) {
  const { subject, html, text } = passwordResetEmail({ resetUrl: RESET_URL, locale });

  check(`[${locale}] subject is non-empty and has no stray placeholder`, Boolean(subject) && !/\{\w+\}/.test(subject), subject);

  check(`[${locale}] HTML contains the reset URL`, html.includes(RESET_URL));

  check(`[${locale}] plain text contains the reset URL`, text.includes(RESET_URL));

  check(
    `[${locale}] declares lang="${LOCALE_HTML_LANG[locale]}"`,
    html.includes(`<html lang="${LOCALE_HTML_LANG[locale]}"`),
  );

  /**
   * An unsubstituted `{placeholder}` is the failure mode `lib/i18n/index.ts` chooses to
   * leave visible rather than blank, precisely so a check like this can catch it.
   */
  check(`[${locale}] no unsubstituted placeholders in the body`, !/\{\w+\}/.test(text));

  /**
   * The catalogue is meant to be complete — `satisfies` in each locale file makes a
   * missing key a compile error — but a raw key leaking into a family's inbox is bad
   * enough to be worth a runtime assertion too.
   */
  check(`[${locale}] no raw message keys leaked`, !/email\.reset\./.test(text));

  check(
    `[${locale}] says nothing that looks like a password`,
    !/\bpassword is\b|\btemporary password\b/i.test(text),
  );
}

/* The token must survive HTML escaping intact — a mangled link is a dead link. */
{
  const { html } = passwordResetEmail({ resetUrl: RESET_URL, locale: "en" });
  const href = html.match(/href="([^"]*reset-password[^"]*)"/)?.[1] ?? "";
  check("The href round-trips the token unchanged", href === RESET_URL, href.slice(0, 80));
}

/* A hostile URL must not be able to break out of the attribute or the body. */
{
  const nasty = 'https://x.test/reset-password?token=a"><script>alert(1)</script>';
  const { html } = passwordResetEmail({ resetUrl: nasty, locale: "en" });
  check(
    "A URL containing markup is escaped, not injected",
    !html.includes("<script>") && html.includes("&lt;script&gt;"),
  );
}

console.log(`\n  ${pass}/${pass + fail} passed\n`);
process.exit(fail ? 1 : 0);
