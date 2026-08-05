/**
 * RESET THE TEST DATABASE — NEVER PRODUCTION
 * =============================================================================
 *   npm run db:reset-test -- --yes                    # clear records, keep accounts
 *   npm run db:reset-test -- --yes --include-users    # clear accounts too
 *
 * Empties the record collections in the TEST database so a run of the end-to-end
 * harnesses starts from a known state. Repeated harness runs accumulate fixture
 * applications, students and drafts, and stale rows are how a test suite starts
 * asserting against the wrong record (see docs/verification.md).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS SCRIPT IS THE MOST DANGEROUS FILE IN THE REPOSITORY, so it is written to be
 * boring and to refuse rather than to be clever. Three independent gates:
 *
 *   1. The database name must NOT be the production database, and must LOOK like a
 *      test database (contain "test", "dev", "local", "scratch" or "tmp"). An
 *      unrecognised name is refused, not assumed safe — a typo must not turn into a
 *      wipe of something that matters.
 *   2. `--yes` is mandatory. No interactive prompt, because this must be safe to run
 *      from a non-interactive shell, and a prompt in a non-interactive shell either
 *      hangs or auto-answers.
 *   3. Documents are deleted per collection with an explicit list. There is no
 *      `dropDatabase()` and no "delete everything you find", so a collection added
 *      later is untouched until someone adds it here deliberately.
 *
 * WHY THESE GATES EXIST: a destructive test helper on this project was once run
 * against the LIVE database and permanently destroyed a family's enrollment
 * application. The audit log proved it happened but holds no PII by design, so it was
 * unrecoverable. Do not relax any of this.
 *
 * `users` is PRESERVED by default. The signed-in accounts are not test data — wiping
 * them means re-seeding an administrator and re-running the fixture script before
 * anything can log in again. Pass --include-users when that is genuinely what you want.
 */

import { getMongoClient } from "../lib/mongodb";
import { createIndexes } from "../lib/db/indexes";
import { COLLECTIONS } from "../lib/db/collections";
import { PRODUCTION_DB_NAME } from "../lib/env";

/** A name must match one of these to be considered a test database. */
const TEST_DB_PATTERN = /test|dev|local|scratch|tmp/i;

/**
 * Collections cleared by a reset, listed explicitly.
 *
 * `users` is absent on purpose and is added conditionally below.
 */
const RECORD_COLLECTIONS: readonly string[] = [
  COLLECTIONS.students,
  COLLECTIONS.enrollmentApplications,
  COLLECTIONS.enrollmentDrafts,
  COLLECTIONS.attendance,
  COLLECTIONS.masteryLogs,
  COLLECTIONS.behaviorRecords,
  COLLECTIONS.taekwondoRanks,
  COLLECTIONS.instructors,
  COLLECTIONS.partnerships,
  COLLECTIONS.inquiries,
  COLLECTIONS.auditLog,
  COLLECTIONS.rateLimits,
  COLLECTIONS.emailQueue,
];

function refuse(message: string): never {
  console.error(`\n  REFUSING TO RUN.\n\n${message}\n`);
  process.exit(1);
}

async function main() {
  const dbName = process.env.MONGODB_DB;
  const confirmed = process.argv.includes("--yes");
  const includeUsers = process.argv.includes("--include-users");

  // --- Gate 1: the target must be a test database --------------------------
  if (!dbName) {
    refuse("  MONGODB_DB is not set. Refusing to guess which database to empty.");
  }
  if (dbName === PRODUCTION_DB_NAME) {
    refuse(
      `  MONGODB_DB is "${dbName}" — the PRODUCTION database.\n` +
        `  This script empties records. It will never run against production.`,
    );
  }
  if (!TEST_DB_PATTERN.test(dbName)) {
    refuse(
      `  MONGODB_DB is "${dbName}", which does not look like a test database.\n\n` +
        `  A name must contain test, dev, local, scratch or tmp to be eligible.\n` +
        `  An unrecognised name is refused rather than assumed safe, because a typo\n` +
        `  must not become a wipe of something that matters.`,
    );
  }

  // --- Gate 2: explicit confirmation ---------------------------------------
  if (!confirmed) {
    refuse(
      `  This would DELETE ALL RECORDS in "${dbName}"` +
        `${includeUsers ? " INCLUDING every user account" : ""}.\n\n` +
        `  Re-run with --yes if that is what you want:\n` +
        `      npm run db:reset-test -- --yes${includeUsers ? " --include-users" : ""}`,
    );
  }

  const client = await getMongoClient();
  const db = client.db(dbName);

  const targets = includeUsers
    ? [...RECORD_COLLECTIONS, COLLECTIONS.users]
    : RECORD_COLLECTIONS;

  console.log(`\n  Resetting "${dbName}"\n`);

  let total = 0;
  for (const name of targets) {
    // Skip collections that do not exist yet rather than creating them.
    const exists = await db.listCollections({ name }).hasNext();
    if (!exists) continue;

    const before = await db.collection(name).countDocuments();
    if (before === 0) continue;

    // --- Gate 3: explicit per-collection delete, never dropDatabase() ------
    const { deletedCount } = await db.collection(name).deleteMany({});
    total += deletedCount;
    console.log(`    ${name.padEnd(26)} ${String(before).padStart(5)} removed`);
  }

  if (!includeUsers) {
    const kept = (await db.listCollections({ name: COLLECTIONS.users }).hasNext())
      ? await db.collection(COLLECTIONS.users).countDocuments()
      : 0;
    console.log(`\n    ${"users".padEnd(26)} ${String(kept).padStart(5)} PRESERVED`);
  }

  // Indexes survive deleteMany, but recreate them so a reset also repairs a database
  // whose indexes were never built or were dropped by hand.
  await createIndexes();

  console.log(`\n  ${total} document(s) removed. Indexes verified.\n`);

  if (includeUsers) {
    console.log(
      `  Accounts were removed. Before anything can sign in again:\n` +
        `      npm run seed:admin -- --email you@example.com --name "Your Name"\n` +
        `      npm run seed:test-fixtures\n`,
    );
  }

  await client.close();
  process.exit(0);
}

main().catch((error) => {
  console.error("\nReset failed:", error);
  process.exit(1);
});
