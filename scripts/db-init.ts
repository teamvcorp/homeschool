/**
 * DATABASE INITIALIZATION
 * =============================================================================
 * Creates every index defined in lib/db/indexes.ts. Idempotent — safe to re-run
 * after adding an index.
 *
 *   npm run db:init
 *
 * Run this once against a new cluster, and again whenever indexes change. It is
 * deliberately NOT executed on application boot: on a serverless platform that
 * would fire a dozen index commands on every cold start.
 */

import { pingDatabase, getMongoClient } from "../lib/mongodb";
import { createIndexes } from "../lib/db/indexes";
import { env } from "../lib/env";

async function main() {
  console.log(`\nThe VA School — database initialization`);
  console.log(`Database: ${env.MONGODB_DB}\n`);

  process.stdout.write("Connecting… ");
  const ping = await pingDatabase();
  if (!ping.ok) {
    console.error(`FAILED\n\n  ${ping.error}\n`);
    console.error("Check MONGODB_URI in .env.local, and that this machine's IP");
    console.error("is allowed in the Atlas Network Access list.\n");
    process.exit(1);
  }
  console.log(`connected (${ping.ms}ms)\n`);

  process.stdout.write("Creating indexes…\n");
  const created = await createIndexes();
  for (const name of created) console.log(`  ✓ ${name}`);

  console.log(`\n${created.length} indexes ensured.\n`);

  // Explicitly close: this is a one-shot script, not a server, so the cached
  // client promise would otherwise keep the process alive.
  const client = await getMongoClient();
  await client.close();
  process.exit(0);
}

main().catch((error) => {
  console.error("\nUnexpected failure:", error);
  process.exit(1);
});
