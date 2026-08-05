/**
 * RUNS EVERY END-TO-END HARNESS, IN ORDER
 * =============================================================================
 *   npm run dev:test                          # terminal 1 — server on va_school_test
 *   npm run seed:test-fixtures                # once, creates the scope-test parent
 *   E2E_ADMIN_PASSWORD=... npm run e2e        # terminal 2
 *
 * Order is deliberate but NOT load-bearing: every harness seeds its own fixtures with
 * per-run unique values, so any one of them can be run alone. That property was won the
 * hard way — see docs/verification.md — and must be preserved. If you add a harness that
 * asserts on a fixed name or reads "the first id on the page", it will pass once and then
 * quietly assert against a previous run's record.
 *
 * Exits non-zero if any harness fails, so this is usable as a single CI gate.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const HARNESSES = [
  ["verify-enroll.mjs", "the enrollment funnel over the no-JS path"],
  ["verify-bugfix.mjs", "the two production bugs: autofill honeypot, sibling carry-over"],
  ["verify-admin.mjs", "admin review flow and every authorization boundary"],
  ["verify-promote.mjs", "the promote trap, school ID, and school email"],
  ["verify-agreement.mjs", "the printable executed agreement"],
];

function run(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, file)], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

const failures = [];

for (const [file, what] of HARNESSES) {
  console.log(`\n${"=".repeat(78)}\n  ${file} — ${what}\n${"=".repeat(78)}`);
  const code = await run(file);
  if (code !== 0) failures.push(file);
}

console.log(`\n${"=".repeat(78)}`);
if (failures.length) {
  console.log(`  ${failures.length} of ${HARNESSES.length} harnesses FAILED:`);
  for (const f of failures) console.log(`    - ${f}`);
  console.log(`${"=".repeat(78)}\n`);
  process.exit(1);
}
console.log(`  All ${HARNESSES.length} harnesses passed.`);
console.log(`${"=".repeat(78)}\n`);
