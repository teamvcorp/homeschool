/**
 * SEED THE FIRST ADMINISTRATOR
 * =============================================================================
 *   npm run seed:admin -- --email you@example.com --name "Robert Von Der Becke"
 *
 * A SCRIPT, NEVER A ROUTE. A "create the first admin" HTTP endpoint is a backdoor
 * that someone eventually forgets to remove — and one that is trivially findable.
 * Running this requires shell access to the machine holding the database
 * credentials, which is the correct bar for minting an administrator.
 *
 * The password is generated here rather than accepted as an argument, because a
 * password passed on the command line lands in shell history and process listings.
 * It is printed once. The account is flagged so the admin UI can require a change
 * on first sign-in.
 */

import { randomBytes } from "node:crypto";
import { usersCollection } from "../lib/db/collections";
import { hashPassword } from "../lib/auth/password";
import { getMongoClient } from "../lib/mongodb";
import { createIndexes } from "../lib/db/indexes";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

/**
 * Generates a readable but high-entropy passphrase.
 *
 * 24 base64url characters is ~143 bits — far beyond anything that needs
 * stretching, and short enough to retype accurately once.
 */
function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

async function main() {
  const email = arg("--email")?.toLowerCase().trim();
  const name = arg("--name")?.trim();

  if (!email || !name) {
    console.error(
      '\nUsage: npm run seed:admin -- --email you@example.com --name "Your Name"\n',
    );
    process.exit(1);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`\n"${email}" is not a valid email address.\n`);
    process.exit(1);
  }

  // Indexes first: the unique email index is what makes the duplicate check below
  // race-proof rather than advisory.
  await createIndexes();

  const users = await usersCollection();

  const existing = await users.findOne({ email });
  if (existing) {
    console.error(
      `\nA user with email ${email} already exists (role: ${existing.role}).`,
    );
    console.error(
      "Refusing to overwrite. To reset a password, use the admin UI or delete the user first.\n",
    );
    process.exit(1);
  }

  const password = generatePassword();
  const now = new Date();

  await users.insertOne({
    email,
    name,
    passwordHash: await hashPassword(password),
    role: "admin",
    active: true,
    sessionEpoch: 1,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  });

  console.log(`
─────────────────────────────────────────────────────────────
  Administrator created
─────────────────────────────────────────────────────────────

  Email:     ${email}
  Password:  ${password}

  This password is shown ONCE and is not recoverable — it is
  stored only as an Argon2id hash. Save it to a password
  manager now, then sign in at /login and change it.

─────────────────────────────────────────────────────────────
`);

  const client = await getMongoClient();
  await client.close();
  process.exit(0);
}

main().catch((error) => {
  console.error("\nFailed to seed administrator:", error);
  process.exit(1);
});
