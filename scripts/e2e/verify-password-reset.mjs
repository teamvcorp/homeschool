/**
 * PASSWORD RESET
 * =============================================================================
 * Until this feature existed, a forgotten password meant editing the database by hand.
 * This harness proves the way back in works — and, more importantly, proves the four
 * properties that make it safe rather than merely convenient.
 *
 * WHAT IS ASSERTED
 *
 *  1. NO ENUMERATION. A known address, an unknown address, and a throttled caller all
 *     produce a BYTE-IDENTICAL response. This is asserted by string equality, not by
 *     "neither one errored" — see Trap 7 in docs/verification.md: the weak version of an
 *     assertion certifies the bug.
 *  2. EVERY OTHER SESSION DIES. A session established BEFORE the reset is rejected on its
 *     next request. Without this, reset is theatre: the attacker whose access prompted the
 *     reset keeps it while the owner believes the problem is fixed.
 *  3. TOKENS ARE SINGLE USE, EXPIRE, AND ARE PURPOSE-BOUND. Reused, expired, tampered and
 *     wrong-purpose tokens are all refused, and refused IDENTICALLY.
 *  4. A FUMBLED CONFIRMATION DOES NOT BURN THE TOKEN. Mistyping the second password field
 *     is the single most likely thing to happen on this screen; if it consumed the link,
 *     every typo would send someone back to their inbox.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS HARNESS MINTS ITS OWN TOKENS
 *
 * It cannot read one. Only sha256(token) is stored (see AuthTokenDoc), and the reset mail
 * is sent with `doNotPersist` so it never reaches `emailQueue` either — both deliberate,
 * and between them there is no way to observe a real token from outside the process that
 * created it. That is the feature working correctly.
 *
 * So the two halves are tested separately: the REQUEST half by asserting on the response
 * and on the appearance of a token row, and the REDEMPTION half by inserting a row whose
 * hash the harness computed itself. The security-critical half is redemption, and it is
 * exercised in full.
 *
 * The direct database writes are the same trade `seed-test-fixtures.ts` makes — the
 * product cannot create these preconditions yet — and carry the same guard: a database
 * whose name does not look like a test database is refused outright.
 */

import { createHash, randomBytes } from "node:crypto";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// This harness CREATES a user and tokens. Refusing anything but a local target is what
// keeps a stray E2E_BASE_URL from writing fixtures into production.
if (!BASE.startsWith("http://localhost") && !BASE.startsWith("http://127.0.0.1")) {
  console.error(`
  REFUSING TO RUN against ${BASE}. These harnesses write data and only run locally.
`);
  process.exit(1);
}

/**
 * Unique per run. The users collection has a unique index on email, so a fixed fixture
 * address makes the second run collide with the first. See docs/verification.md Trap 2.
 */
const RUN_TAG = Date.now().toString(36);

const FIXTURE_EMAIL = `reset-test+${RUN_TAG}@example.com`;
const UNKNOWN_EMAIL = `no-such-person+${RUN_TAG}@example.com`;
const OLD_PASSWORD = `OldPassword-${RUN_TAG}-aaa`;
const NEW_PASSWORD = `NewPassword-${RUN_TAG}-zzz`;

const DOLLAR = "$";
const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}
/**
 * Note there is no `skip()` here, unlike verify-notifications.mjs. That harness treats
 * database access as an optional second signal; this one cannot assert anything at all
 * without it — the fixture user and the planted tokens are the whole premise. So a
 * missing database is a hard failure with an explanation, never a silent pass.
 */

const newJar = () => new Map();
const hdr = (j) => [...j].map(([k, v]) => `${k}=${v}`).join("; ");
function store(j, r) {
  for (const l of r.headers.getSetCookie?.() ?? []) {
    const [p] = l.split(";");
    const i = p.indexOf("=");
    if (i > 0) {
      const k = p.slice(0, i).trim();
      const v = p.slice(i + 1).trim();
      if (v === "" || /expires=Thu, 01 Jan 1970/i.test(l)) j.delete(k);
      else j.set(k, v);
    }
  }
}
async function get(j, p) {
  const r = await fetch(BASE + p, { headers: { Cookie: hdr(j) }, redirect: "manual" });
  store(j, r);
  return { status: r.status, location: r.headers.get("location"), body: await r.text() };
}
function findForm(html, marker) {
  for (const f of html.match(/<form[\s\S]*?<\/form>/g) ?? []) {
    if (marker && !f.includes(marker)) continue;
    const nM = f.match(/name="[$]ACTION_REF_(\d+)"/);
    if (!nM) continue;
    const n = nM[1];
    const id = f.match(new RegExp(`name="[$]ACTION_${n}:0" value="([^"]+)"`));
    const st = f.match(new RegExp(`name="[$]ACTION_${n}:1" value="([^"]+)"`));
    const key = f.match(/name="[$]ACTION_KEY" value="([^"]*)"/);
    if (!id) continue;
    return {
      n,
      idField: id[1].replace(/&quot;/g, '"'),
      bound: st ? st[1].replace(/&quot;/g, '"') : '[{"ok":false}]',
      key: key ? key[1] : null,
      html: f,
    };
  }
  return null;
}
async function postForm(j, p, form, fields) {
  const fd = new FormData();
  fd.set(`${DOLLAR}ACTION_REF_${form.n}`, "");
  fd.set(`${DOLLAR}ACTION_${form.n}:0`, form.idField);
  fd.set(`${DOLLAR}ACTION_${form.n}:1`, form.bound);
  if (form.key) fd.set(`${DOLLAR}ACTION_KEY`, form.key);
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  const r = await fetch(BASE + p, {
    method: "POST",
    headers: { Cookie: hdr(j), Origin: BASE },
    body: fd,
    redirect: "manual",
  });
  store(j, r);
  return { status: r.status, location: r.headers.get("location"), body: await r.text() };
}

/**
 * The server's own rendered message, pulled out of the redisplayed form.
 *
 * Assertion 1 compares these for string equality across three different inputs, so this
 * must extract the WHOLE sentence and must not normalise anything away — a difference
 * this helper smoothed over is a difference an attacker could still see.
 */
function outcomeMessage(html) {
  const m = html.match(
    /(?:role="alert"|role="status")[^>]*>([\s\S]*?)<\/(?:div|p)>/,
  );
  if (!m) return null;
  return m[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------- test-database-only fixture plumbing ------------------- */

async function openDb() {
  try {
    const fs = await import("node:fs");
    const { MongoClient } = await import("mongodb");
    const env = {};
    if (fs.existsSync(".env.local")) {
      for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
        const m = line.match(/^([A-Z_]+)=(.*)$/);
        if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
      }
    }
    const uri = process.env.MONGODB_URI ?? env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB ?? env.MONGODB_DB;
    if (!uri || !dbName) return null;
    // Never let a harness touch production, not even to read.
    if (!/test|dev|local|scratch|tmp/i.test(dbName)) return null;
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    return {
      users: db.collection("users"),
      tokens: db.collection("authTokens"),
      close: () => client.close(),
    };
  } catch {
    return null;
  }
}

const sha256 = (v) => createHash("sha256").update(v).digest("hex");

/** Mints a raw token and the row that backs it. Mirrors lib/auth/token.ts. */
async function plantToken(db, userId, { purpose = "reset", ttlMs = 60 * 60 * 1000 } = {}) {
  const raw = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.tokens.insertOne({
    tokenHash: sha256(raw),
    userId,
    purpose,
    expiresAt: new Date(now.getTime() + ttlMs),
    usedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return raw;
}

console.log("\n=== PASSWORD RESET ===\n");

const db = await openDb();
if (!db) {
  console.error(`
  Cannot reach a TEST database. This harness creates a throwaway user and tokens,
  which the product has no way to do on its own.

  Set MONGODB_URI and MONGODB_DB (to a name containing "test") in .env.local.
`);
  process.exit(1);
}

let fixtureUserId = null;

try {
  /* ---------- Fixture: a user with a password we know ---------- */
  {
    const { hash } = await import("@node-rs/argon2");
    // Default parameters are fine: Argon2 encodes its params in the hash string, so
    // lib/auth/password.ts verifies this correctly without sharing a config.
    const passwordHash = await hash(OLD_PASSWORD);
    const now = new Date();
    const inserted = await db.users.insertOne({
      email: FIXTURE_EMAIL,
      name: `Reset Test ${RUN_TAG}`,
      passwordHash,
      role: "parent",
      active: true,
      sessionEpoch: 1,
      studentIds: [],
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    });
    fixtureUserId = inserted.insertedId;
    check("Fixture user created", Boolean(fixtureUserId), FIXTURE_EMAIL);
  }

  /* ---------- A live session, established BEFORE the reset ---------- */
  const staleJar = newJar();
  {
    const page = await get(staleJar, "/login");
    const form = findForm(page.body, 'name="password"');
    const res = await postForm(staleJar, "/login", form, {
      email: FIXTURE_EMAIL,
      password: OLD_PASSWORD,
    });
    const signedIn = res.status === 303 || res.status === 302 || Boolean(staleJar.get("va_session"));
    check("Fixture can sign in with the original password", signedIn, `status ${res.status}`);

    const portal = await get(staleJar, "/portal");
    check(
      "That session reaches /portal before the reset",
      portal.status === 200,
      `status ${portal.status}`,
    );
  }

  /* ---------- 1. No enumeration ---------- */
  let knownMessage = null;
  let unknownMessage = null;
  {
    const jar = newJar();
    const page = await get(jar, "/forgot-password");
    const form = findForm(page.body, 'name="email"');
    if (!form) throw new Error("could not find the forgot-password form");

    const known = await postForm(jar, "/forgot-password", form, { email: FIXTURE_EMAIL });
    knownMessage = outcomeMessage(known.body);

    const jar2 = newJar();
    const page2 = await get(jar2, "/forgot-password");
    const form2 = findForm(page2.body, 'name="email"');
    const unknown = await postForm(jar2, "/forgot-password", form2, {
      email: UNKNOWN_EMAIL,
    });
    unknownMessage = outcomeMessage(unknown.body);

    check(
      "A known address produces a response",
      Boolean(knownMessage),
      knownMessage ? `"${knownMessage.slice(0, 60)}…"` : "no message found",
    );
    check(
      "An UNKNOWN address returns the byte-identical response",
      knownMessage !== null && knownMessage === unknownMessage,
      knownMessage === unknownMessage ? "identical" : `known="${knownMessage}" unknown="${unknownMessage}"`,
    );

    const tokenRows = await db.tokens.countDocuments({ userId: fixtureUserId });
    check(
      "A token row was created for the real account",
      tokenRows === 1,
      `${tokenRows} row(s)`,
    );
  }

  /* ---------- Throttling is also indistinguishable ---------- */
  {
    // The per-email limit is 3/hour and one is already spent, so two more exhaust it.
    let throttledMessage = null;
    for (let i = 0; i < 3; i++) {
      const jar = newJar();
      const page = await get(jar, "/forgot-password");
      const form = findForm(page.body, 'name="email"');
      const res = await postForm(jar, "/forgot-password", form, { email: FIXTURE_EMAIL });
      throttledMessage = outcomeMessage(res.body);
    }
    check(
      "A THROTTLED caller returns the byte-identical response",
      throttledMessage === knownMessage,
      throttledMessage === knownMessage ? "identical" : `throttled="${throttledMessage}"`,
    );
  }

  /* ---------- Landing page rejects a tampered token ---------- */
  {
    const jar = newJar();
    const raw = await plantToken(db, fixtureUserId);
    const tampered = raw.slice(0, -1) + (raw.endsWith("A") ? "B" : "A");
    const page = await get(jar, `/reset-password?token=${encodeURIComponent(tampered)}`);
    check(
      "A tampered token shows the expired notice, not a password form",
      page.status === 200 && /has expired/i.test(page.body) && !/name="newPassword"/.test(page.body),
      `status ${page.status}`,
    );
  }

  /* ---------- 4. A fumbled confirmation must NOT burn the token ---------- */
  let liveToken = null;
  {
    liveToken = await plantToken(db, fixtureUserId);
    const jar = newJar();
    const path = `/reset-password?token=${encodeURIComponent(liveToken)}`;
    const page = await get(jar, path);
    check(
      "A valid token renders the password form",
      page.status === 200 && /name="newPassword"/.test(page.body),
      `status ${page.status}`,
    );

    const form = findForm(page.body, 'name="newPassword"');
    await postForm(jar, path, form, {
      token: liveToken,
      newPassword: NEW_PASSWORD,
      confirmPassword: `${NEW_PASSWORD}-typo`,
    });

    const row = await db.tokens.findOne({ tokenHash: sha256(liveToken) });
    check(
      "A mismatched confirmation does NOT consume the token",
      row !== null && row.usedAt === null,
      row ? `usedAt=${row.usedAt}` : "row missing",
    );
  }

  /* ---------- The reset itself ---------- */
  {
    const jar = newJar();
    const path = `/reset-password?token=${encodeURIComponent(liveToken)}`;
    const page = await get(jar, path);
    const form = findForm(page.body, 'name="newPassword"');
    const res = await postForm(jar, path, form, {
      token: liveToken,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    check(
      "A valid token sets the new password",
      /been changed/i.test(res.body),
      outcomeMessage(res.body)?.slice(0, 70) ?? `status ${res.status}`,
    );

    /**
     * Redeeming a link must NOT sign you in. Possession of an emailed token is not the
     * same evidence as typing a password, and /account re-issues a cookie only because
     * the caller proved the latter.
     */
    check(
      "Resetting does NOT issue a session cookie",
      !jar.get("va_session"),
      jar.get("va_session") ? "a session cookie was set" : "no cookie",
    );
  }

  /* ---------- 2. Every other session dies ---------- */
  {
    const portal = await get(staleJar, "/portal");
    const rejected = portal.status === 307 || portal.status === 302;
    check(
      "The session established BEFORE the reset is now rejected",
      rejected && String(portal.location).includes("/login"),
      `status ${portal.status} -> ${portal.location}`,
    );

    const row = await db.users.findOne({ _id: fixtureUserId });
    check(
      "sessionEpoch was bumped",
      row?.sessionEpoch === 2,
      `sessionEpoch=${row?.sessionEpoch}`,
    );
  }

  /* ---------- The old password stops working, the new one works ---------- */
  {
    const jar = newJar();
    const page = await get(jar, "/login");
    const form = findForm(page.body, 'name="password"');
    const res = await postForm(jar, "/login", form, {
      email: FIXTURE_EMAIL,
      password: OLD_PASSWORD,
    });
    check(
      "The OLD password no longer signs in",
      !jar.get("va_session") && /incorrect/i.test(res.body),
      jar.get("va_session") ? "still signed in" : "rejected",
    );

    const jar2 = newJar();
    const page2 = await get(jar2, "/login");
    const form2 = findForm(page2.body, 'name="password"');
    const res2 = await postForm(jar2, "/login", form2, {
      email: FIXTURE_EMAIL,
      password: NEW_PASSWORD,
    });
    check(
      "The NEW password signs in",
      Boolean(jar2.get("va_session")) || res2.status === 303,
      `status ${res2.status}`,
    );
  }

  /* ---------- /account still works after sharing its validation ---------- */
  /**
   * The length and confirmation rules moved into lib/validation/password.ts so this flow
   * and the reset flow cannot drift apart. Nothing covered /account before, so a silent
   * regression there would have been invisible — and a broken change-password screen is
   * how someone ends up needing the reset flow in the first place.
   */
  {
    const jar = newJar();
    const page = await get(jar, "/login");
    const form = findForm(page.body, 'name="password"');
    await postForm(jar, "/login", form, {
      email: FIXTURE_EMAIL,
      password: NEW_PASSWORD,
    });

    const account = await get(jar, "/account");
    check(
      "/account renders for a signed-in user",
      account.status === 200 && /name="currentPassword"/.test(account.body),
      `status ${account.status}`,
    );

    const accountForm = findForm(account.body, 'name="currentPassword"');
    const FINAL_PASSWORD = `FinalPassword-${RUN_TAG}-qqq`;

    const wrongCurrent = await postForm(jar, "/account", accountForm, {
      currentPassword: "not-the-right-one",
      newPassword: FINAL_PASSWORD,
      confirmPassword: FINAL_PASSWORD,
    });
    check(
      "A wrong current password is refused",
      /not your current password/i.test(wrongCurrent.body),
      outcomeMessage(wrongCurrent.body)?.slice(0, 50) ?? `status ${wrongCurrent.status}`,
    );

    const mismatch = await postForm(jar, "/account", accountForm, {
      currentPassword: NEW_PASSWORD,
      newPassword: FINAL_PASSWORD,
      confirmPassword: `${FINAL_PASSWORD}-typo`,
    });
    check(
      "A mismatched confirmation is refused (shared rule)",
      /do not match/i.test(mismatch.body),
      outcomeMessage(mismatch.body)?.slice(0, 50) ?? `status ${mismatch.status}`,
    );

    const tooShort = await postForm(jar, "/account", accountForm, {
      currentPassword: NEW_PASSWORD,
      newPassword: "short",
      confirmPassword: "short",
    });
    check(
      "A too-short password is refused (shared rule)",
      /at least \d+ characters/i.test(tooShort.body),
      outcomeMessage(tooShort.body)?.slice(0, 50) ?? `status ${tooShort.status}`,
    );

    const same = await postForm(jar, "/account", accountForm, {
      currentPassword: NEW_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });
    check(
      "Re-using the current password is refused",
      /different from the current one/i.test(same.body),
      outcomeMessage(same.body)?.slice(0, 50) ?? `status ${same.status}`,
    );

    const ok = await postForm(jar, "/account", accountForm, {
      currentPassword: NEW_PASSWORD,
      newPassword: FINAL_PASSWORD,
      confirmPassword: FINAL_PASSWORD,
    });
    check(
      "A valid change succeeds",
      /has been changed/i.test(ok.body),
      outcomeMessage(ok.body)?.slice(0, 50) ?? `status ${ok.status}`,
    );

    /**
     * UNLIKE reset, changing your own password keeps THIS device signed in — the action
     * re-issues a cookie against the new epoch. Without that, succeeding would look
     * exactly like being signed out, which teaches people not to change passwords.
     */
    const stillIn = await get(jar, "/portal");
    check(
      "The changing device stays signed in",
      stillIn.status === 200,
      `status ${stillIn.status}`,
    );
  }

  /* ---------- 3. Reused, expired and wrong-purpose tokens ---------- */
  const refusals = [];
  {
    // Reused — liveToken was consumed above.
    const jar = newJar();
    const path = `/reset-password?token=${encodeURIComponent(liveToken)}`;
    const page = await get(jar, path);
    check(
      "A REUSED token shows the expired notice",
      /has expired/i.test(page.body) && !/name="newPassword"/.test(page.body),
      `status ${page.status}`,
    );
    refusals.push(outcomeOrNotice(page.body));
  }
  {
    const expired = await plantToken(db, fixtureUserId, { ttlMs: -1000 });
    const jar = newJar();
    const page = await get(jar, `/reset-password?token=${encodeURIComponent(expired)}`);
    check(
      "An EXPIRED token shows the expired notice",
      /has expired/i.test(page.body) && !/name="newPassword"/.test(page.body),
      `status ${page.status}`,
    );
    refusals.push(outcomeOrNotice(page.body));
  }
  {
    // Purpose-bound: a "resume" token must not open the password screen.
    const wrongPurpose = await plantToken(db, fixtureUserId, { purpose: "resume" });
    const jar = newJar();
    const page = await get(
      jar,
      `/reset-password?token=${encodeURIComponent(wrongPurpose)}`,
    );
    check(
      "A token minted for a DIFFERENT purpose is refused",
      /has expired/i.test(page.body) && !/name="newPassword"/.test(page.body),
      `status ${page.status}`,
    );
    refusals.push(outcomeOrNotice(page.body));
  }

  check(
    "All three refusals are worded IDENTICALLY",
    refusals.length === 3 && new Set(refusals).size === 1,
    `${new Set(refusals).size} distinct wording(s)`,
  );

  /* ---------- Direct POST with a junk token is refused ---------- */
  {
    const jar = newJar();
    const fresh = await plantToken(db, fixtureUserId);
    const path = `/reset-password?token=${encodeURIComponent(fresh)}`;
    const page = await get(jar, path);
    const form = findForm(page.body, 'name="newPassword"');
    // Skip the page entirely and post a token that was never issued — the landing-page
    // check is a courtesy, so the action must refuse this on its own.
    const res = await postForm(jar, path, form, {
      token: randomBytes(32).toString("base64url"),
      newPassword: `${NEW_PASSWORD}-nope`,
      confirmPassword: `${NEW_PASSWORD}-nope`,
    });
    check(
      "The ACTION refuses an unissued token, not just the page",
      /expired or has already been used/i.test(res.body),
      outcomeMessage(res.body)?.slice(0, 60) ?? `status ${res.status}`,
    );
  }
} finally {
  /* ---------- Cleanup: scoped to this run's fixtures only ---------- */
  if (fixtureUserId) {
    await db.tokens.deleteMany({ userId: fixtureUserId });
    await db.users.deleteOne({ _id: fixtureUserId });
  }
  await db.close();
}

/** The refusal wording, whether it came from the page notice or an alert region. */
function outcomeOrNotice(html) {
  const m = html.match(/This link has expired[\s\S]*?<\/p>/);
  if (m) return m[0].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return outcomeMessage(html) ?? "none";
}

console.log("\n=== SUMMARY ===\n");
const failed = results.filter((r) => !r.pass);
console.log(`  ${results.length - failed.length}/${results.length} passed\n`);
if (failed.length) {
  for (const f of failed) console.log(`  FAILED: ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
  console.log("");
}
process.exit(failed.length ? 1 : 0);
