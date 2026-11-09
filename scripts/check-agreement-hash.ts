/**
 * AGREEMENT FINGERPRINTS — REGRESSION LOCK
 * =============================================================================
 *   npm run check:agreement            verify every version
 *   npm run check:agreement -- --print print each version's text and digest
 *
 * Pins the SHA-256 of the canonical text of EVERY agreement version as a literal, so any
 * change to the wording families sign fails loudly and deliberately.
 *
 * Since 2026-11-09 the agreement is versioned by state (lib/enrollment/agreement-text.ts):
 *   - "2026-08-01"          Iowa, Document 9 as filed. Its digest below is the ORIGINAL
 *                           pre-versioning value — the versioning refactor was required
 *                           to reproduce it exactly, so every Iowa signature already on
 *                           file still matches.
 *   - "2026-11-09-national" every other state. Approved by counsel 2026-11-09.
 *
 * WHY THIS IS NOT PARANOIA
 * `agreementHash()` is the evidence of what a family signed. The risk this guards is an
 * UNNOTICED change: the text is assembled from agreement-text.ts, `tuition` in
 * lib/site.ts and the acknowledgment order in lib/db/enums.ts. Editing the tuition
 * figure or reordering ACKNOWLEDGMENT_KEYS silently changes the agreement — families then
 * sign different terms under the same version id.
 *
 * WHEN THIS FAILS, THAT MAY BE CORRECT — but it must be a decision, not an accident:
 *   - Never update a pin for a version families have already signed. Add a NEW version id
 *     in agreement-text.ts instead, and pin it here.
 *   - Say so in the commit message, because you have changed a legal document.
 */

import { agreementHash, agreementText, AGREEMENTS, CONSENT_VERSIONS } from "../lib/enrollment/agreement";
import type { ConsentVersion } from "../lib/enrollment/agreement";

const EXPECTED: Record<ConsentVersion, string> = {
  // ⚠️  Do not change: this is the digest every pre-2026-11-09 signature carries.
  "2026-08-01": "2308d0e09a77c66fd2fb3f245087037547c6254b2cb479d472bbcf5c0ec710bb",
  "2026-11-09-national": "067a373d51d230f9247973af6e08c205974dbbee36edfdba666fde89b51973da",
};

if (process.argv.includes("--print")) {
  for (const version of CONSENT_VERSIONS) {
    const agreement = AGREEMENTS[version];
    console.log(`\n--- ${version} (${agreement.appliesTo}) ---\n`);
    console.log(agreementText(agreement));
    console.log(`\n  sha256 : ${agreementHash(agreement)}`);
  }
  console.log();
  process.exit(0);
}

console.log("\n=== AGREEMENT FINGERPRINTS ===\n");

let failed = false;
for (const version of CONSENT_VERSIONS) {
  const actual = agreementHash(AGREEMENTS[version]);
  if (actual === EXPECTED[version]) {
    console.log(`  PASS  ${version}  sha256 ${actual}`);
  } else {
    failed = true;
    console.error(
      `  FAIL  ${version} — the agreement text has changed.\n` +
        `        expected : ${EXPECTED[version]}\n` +
        `        actual   : ${actual}\n`,
    );
  }
}

/** A version added to agreement-text.ts without a pin here is itself a failure. */
for (const version of Object.keys(EXPECTED)) {
  if (!(CONSENT_VERSIONS as readonly string[]).includes(version)) {
    failed = true;
    console.error(`  FAIL  pinned version "${version}" no longer exists in agreement-text.ts`);
  }
}

if (failed) {
  console.error(
    "\n  This is a change to a legal document families sign. If intended, add a NEW version\n" +
      "  id rather than editing a signed one, then pin it here. Run with --print to see the text.\n",
  );
  process.exit(1);
}
console.log("\n  All agreement versions match their pins.\n");
process.exit(0);
