/**
 * SEED TEST FIXTURES — DEVELOPMENT AND TEST DATABASES ONLY
 * =============================================================================
 *   MONGODB_DB=va_school_test npx tsx --env-file-if-exists=.env.local \
 *     --conditions=react-server scripts/seed-test-fixtures.ts
 *
 * Creates the accounts the end-to-end harnesses need but the product cannot make
 * yet — specifically a `parent` with NO linked students, which is what proves the
 * cross-family scope boundary actually holds (a parent must not be able to read
 * another family's student by guessing an id).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS REFUSES TO RUN OUTSIDE va_school_test
 *
 * This script writes accounts with KNOWN, HARDCODED passwords. On a production
 * database that is a backdoor, not a fixture. The guard below is therefore a hard
 * refusal on the database NAME rather than a warning or a --force flag, because
 * the failure mode it prevents already happened once on this project: a
 * destructive test helper was run against the live database and deleted a real
 * family's enrollment application, which was unrecoverable.
 *
 * The check is on the resolved database name, not NODE_ENV — NODE_ENV is easy to
 * get wrong and says nothing about which cluster the URI points at.
 *
 * Consequence: never add this to `npm run` alongside the real seeds, and never
 * relax the guard. If you need fixtures in another database, rename that database.
 */

import { usersCollection } from "../lib/db/collections";
import { hashPassword } from "../lib/auth/password";
import { getMongoClient } from "../lib/mongodb";
import { createIndexes } from "../lib/db/indexes";

/** The only database this script may ever touch. */
const ALLOWED_DB = "va_school_test";

/**
 * Fixture accounts. Passwords are intentionally in source: these are throwaway
 * credentials on a throwaway database, and the harnesses need to know them.
 */
const FIXTURES = [
  {
    email: "scope-test-parent@example.com",
    name: "Scope Test Parent",
    password: "ScopeTestPassword123!",
    role: "parent" as const,
    /**
     * Deliberately NO studentIds. An empty guardian scope is the interesting case:
     * every student id in the database must be unreachable for this account.
     */
  },
];

async function main() {
  const dbName = process.env.MONGODB_DB;

  if (dbName !== ALLOWED_DB) {
    console.error(
      `\n  REFUSING TO RUN.\n\n` +
        `  MONGODB_DB is ${dbName ? `"${dbName}"` : "unset"}, and this script only\n` +
        `  runs against "${ALLOWED_DB}". It creates accounts with hardcoded\n` +
        `  passwords, so running it anywhere else would install a backdoor.\n\n` +
        `  Set MONGODB_DB=${ALLOWED_DB} and try again.\n`,
    );
    process.exit(1);
  }

  await createIndexes();

  /**
   * `--clear-rate-limits` makes the e2e suite repeatable.
   *
   * The public enrollment submit is capped per IP per hour. A full harness run spends
   * several of those, so running the suite twice in an hour trips the limiter and the
   * later harnesses fail with "We have received several submissions from your
   * connection recently" — the app working exactly as designed, reported as a test
   * failure. Diagnosing that from a bare `status=200` wastes a lot of time.
   *
   * Safe to clear because `rateLimits` is ephemeral by design: every document carries a
   * TTL and would expire on its own. Nothing here is a record of anything.
   *
   * Deliberately opt-in rather than automatic — a reset that happened on every seed
   * would quietly hide a genuine limiter regression from the harness that tests it.
   */
  if (process.argv.includes("--clear-rate-limits")) {
    const { getMongoClient: getClient } = await import("../lib/mongodb");
    const client = await getClient();
    const removed = await client
      .db(dbName)
      .collection("rateLimits")
      .deleteMany({});
    console.log(`  cleared ${removed.deletedCount} rate-limit counter(s)`);
  }

  const users = await usersCollection();
  const now = new Date();

  for (const fixture of FIXTURES) {
    const passwordHash = await hashPassword(fixture.password);

    /**
     * Upsert rather than refuse-if-exists (the stance seed-admin.ts takes). A
     * fixture has to be idempotent so a harness can be rerun; bumping
     * sessionEpoch invalidates any session issued against a previous password.
     */
    const result = await users.findOneAndUpdate(
      { email: fixture.email },
      {
        $set: {
          name: fixture.name,
          passwordHash,
          role: fixture.role,
          active: true,
          updatedAt: now,
        },
        $inc: { sessionEpoch: 1 },
        $setOnInsert: { email: fixture.email, createdAt: now, lastLoginAt: null },
      },
      { upsert: true, returnDocument: "after" },
    );

    console.log(
      `  ${result ? "ok" : "created"}  ${fixture.email}  (role: ${fixture.role})`,
    );
  }

  console.log(`\n  Fixtures seeded into "${dbName}".\n`);

  const client = await getMongoClient();
  await client.close();
  process.exit(0);
}

main().catch((error) => {
  console.error("\nFailed to seed test fixtures:", error);
  process.exit(1);
});
