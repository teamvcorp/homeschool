/**
 * AGREEMENT FINGERPRINT — REGRESSION LOCK
 * =============================================================================
 *   npm run check:agreement
 *
 * Pins the SHA-256 of the canonical agreement text as a literal, so that ANY change to
 * the wording families sign fails loudly and deliberately.
 *
 * WHY THIS IS NOT PARANOIA
 *
 * `agreementHash()` is the evidence of what a family signed. Every signature record
 * stores the digest that was current at signing, so if the wording changes, historical
 * records keep identifying their own version — that part is already correct.
 *
 * The risk this guards is different: an UNNOTICED change. The agreement text is
 * assembled from three sources (lib/enrollment/agreement-text.ts, `tuition` in
 * lib/site.ts via the monthly-contribution acknowledgment, and CONSENT_VERSION in
 * lib/db/enums.ts). Editing the tuition figure, or reordering ACKNOWLEDGMENT_KEYS,
 * silently changes the agreement — from then on families sign different terms under the
 * same consent version, and nobody notices until it matters legally.
 *
 * This is especially load-bearing while translations are being added: the whole design
 * is that translated text is DISPLAY ONLY and English remains the hashed instrument.
 * If a refactor ever routes a translation into agreementText(), this test fails.
 *
 * WHEN THIS TEST FAILS, THAT MAY BE CORRECT — but it must be a decision, not an
 * accident. If the change is intended:
 *   1. Bump CONSENT_VERSION in lib/db/enums.ts (see the warning in agreement-text.ts).
 *   2. Update EXPECTED_HASH and EXPECTED_CONSENT_VERSION below.
 *   3. Say so in the commit message, because you have changed a legal document.
 */

import { agreementHash, agreementText } from "../lib/enrollment/agreement";
import { CONSENT_VERSION } from "../lib/db/enums";

/**
 * The digest of the agreement as it stands. Regenerate deliberately, never casually —
 * run this script with --print to see the current value and the text it came from.
 */
const EXPECTED_HASH =
  "2308d0e09a77c66fd2fb3f245087037547c6254b2cb479d472bbcf5c0ec710bb";

/** The consent version the pinned hash belongs to. */
const EXPECTED_CONSENT_VERSION = CONSENT_VERSION;

const actual = agreementHash();

if (process.argv.includes("--print")) {
  console.log("\n--- canonical agreement text ---\n");
  console.log(agreementText());
  console.log("\n--- digest ---\n");
  console.log(`  consent version : ${CONSENT_VERSION}`);
  console.log(`  sha256          : ${actual}\n`);
  process.exit(0);
}

console.log("\n=== AGREEMENT FINGERPRINT ===\n");

if (actual !== EXPECTED_HASH) {
  console.error(
    `  FAIL  The agreement text has changed.\n\n` +
      `    expected : ${EXPECTED_HASH}\n` +
      `    actual   : ${actual}\n\n` +
      `  This is a change to the legal document families sign. If it was intended:\n` +
      `    1. Bump CONSENT_VERSION in lib/db/enums.ts (currently "${CONSENT_VERSION}").\n` +
      `    2. Update EXPECTED_HASH in this file to the actual value above.\n` +
      `    3. Note the change in your commit message.\n\n` +
      `  If it was NOT intended, something edited the agreement wording, the tuition\n` +
      `  figure, or the acknowledgment order. Run with --print to see the current text.\n`,
  );
  process.exit(1);
}

console.log(`  PASS  agreement text unchanged`);
console.log(`        consent version ${EXPECTED_CONSENT_VERSION}`);
console.log(`        sha256 ${actual}\n`);
process.exit(0);
