/**
 * CONNECTIVITY CHECK
 * =============================================================================
 *   npm run db:ping
 *
 * Confirms the app can reach MongoDB with the current .env.local, and reports
 * which collections and indexes exist. Useful as a first diagnostic before
 * assuming an application bug.
 *
 * Prints no secrets — never the connection string, never a credential.
 */

import { pingDatabase, getDb, getMongoClient } from "../lib/mongodb";
import { env } from "../lib/env";

async function main() {
  console.log(`\nThe VA School — database connectivity check`);
  console.log(`Database: ${env.MONGODB_DB}\n`);

  const ping = await pingDatabase();
  if (!ping.ok) {
    console.error(`  ✗ Connection FAILED\n`);
    console.error(`    ${ping.error}\n`);
    console.error(`  Things to check:`);
    console.error(`    • MONGODB_URI in .env.local is correct`);
    console.error(`    • This machine's IP is in the Atlas Network Access list`);
    console.error(`    • The database user has readWrite on "${env.MONGODB_DB}"\n`);
    process.exit(1);
  }

  console.log(`  ✓ Connected (${ping.ms}ms)\n`);

  const db = await getDb();
  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log(`  No collections yet. Run \`npm run db:init\` to create indexes,`);
    console.log(`  then \`npm run seed:admin\` to create the first administrator.\n`);
  } else {
    console.log(`  Collections (${collections.length}):\n`);
    for (const info of collections.sort((a, b) => a.name.localeCompare(b.name))) {
      const collection = db.collection(info.name);
      const count = await collection.estimatedDocumentCount();
      const indexes = await collection.indexes();
      console.log(
        `    ${info.name.padEnd(26)} ${String(count).padStart(6)} docs   ${indexes.length} indexes`,
      );
    }
    console.log();
  }

  const client = await getMongoClient();
  await client.close();
  process.exit(0);
}

main().catch((error) => {
  console.error("\nUnexpected failure:", error);
  process.exit(1);
});
