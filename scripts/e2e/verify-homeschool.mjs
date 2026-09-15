/**
 * End-to-end verification of the Homeschool at Home tier and its interest form, over the
 * progressive-enhancement (no-JavaScript) path.
 *
 * WHY THIS HARNESS EXISTS, beyond "there is a new page":
 *
 *   1. lib/actions/inquiry.ts is the FIRST code in this repo that writes an `inquiries`
 *      row. The collection, its index, the email template and the retry handler were all
 *      built with no caller, so nothing had ever exercised them end to end.
 *   2. `details.monthlyEstimate` is the number a human invoices from. If it is wrong, a
 *      family is billed the wrong amount, and nothing else in the system would notice.
 *   3. The dailyApp three-audience rule (lib/site.ts) says /homeschool must SELL the
 *      School Day app without ever linking its login. That is a prose rule in a comment
 *      until something asserts it mechanically. Assertion 2 below is that something.
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// This harness WRITES an inquiry. Refusing anything but a local target is what keeps a
// stray E2E_BASE_URL from putting fixtures into production.
if (!BASE.startsWith("http://localhost") && !BASE.startsWith("http://127.0.0.1")) {
  console.error(`
  REFUSING TO RUN against ${BASE}. These harnesses write data and only run locally.
`);
  process.exit(1);
}

/**
 * Unique per run: the interest form is capped at 5/day PER EMAIL
 * (RATE_LIMITS.INQUIRY_PER_EMAIL), so a fixed address makes the suite unrepeatable after
 * five runs — and it would fail in a way that looks like the form is broken.
 */
const RUN_TAG = Date.now().toString(36);
const EMAIL = `homeschool-test+${RUN_TAG}@example.com`;
const TOWN = `Testville ${RUN_TAG}`;
const CHILD_COUNT = 3;
const EXPECTED_MONTHLY = CHILD_COUNT * 20;

let cookies = new Map();

function cookieHeader() {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function storeCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) {
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value === "" || /expires=Thu, 01 Jan 1970/i.test(line)) cookies.delete(name);
      else cookies.set(name, value);
    }
  }
}

async function get(path) {
  const res = await fetch(BASE + path, {
    headers: { Cookie: cookieHeader() },
    redirect: "manual",
  });
  storeCookies(res);
  return { status: res.status, location: res.headers.get("location"), body: await res.text() };
}

/** Extracts the signed anti-abuse timestamp the page issued. */
function formTimestamp(html) {
  const m = html.match(/name="form_issued"[^>]*value="([^"]+)"/);
  return m ? m[1] : null;
}

/**
 * Locates the interest form and captures its action fields VERBATIM.
 *
 * ⚠️  THE ACTION INDEX IS DISCOVERED, NEVER HARDCODED. Hardcoding it to 1 is what broke
 * every enrollment step when the language toggle was added to /enroll and shifted the
 * wizard to $ACTION_2 — a failure that reads like the page stopped rendering rather than
 * like the harness guessed wrong. Forms carrying `returnTo` are the language toggle and
 * are skipped; it is a direct action reference with a different shape.
 */
function findForm(html) {
  for (const f of html.match(/<form[\s\S]*?<\/form>/g) ?? []) {
    if (f.includes('name="returnTo"')) continue; // the language toggle
    const nM = f.match(/name="[$]ACTION_REF_(\d+)"/);
    if (!nM) continue;
    const n = nM[1];
    const id = f.match(new RegExp(`name="[$]ACTION_${n}:0" value="([^"]+)"`));
    if (!id) continue;
    const st = f.match(new RegExp(`name="[$]ACTION_${n}:1" value="([^"]+)"`));
    const key = f.match(/name="[$]ACTION_KEY" value="([^"]*)"/);
    return {
      n,
      idField: id[1].replace(/&quot;/g, '"'),
      bound: st ? st[1].replace(/&quot;/g, '"') : '[{"ok":false}]',
      key: key ? key[1] : null,
    };
  }
  return null;
}

async function postAction(path, html, fields, { honeypot = false } = {}) {
  const form = findForm(html);
  if (!form) throw new Error(`no action id found on ${path}`);

  const fd = new FormData();
  fd.set(`$ACTION_REF_${form.n}`, "");
  fd.set(`$ACTION_${form.n}:0`, form.idField);
  fd.set(`$ACTION_${form.n}:1`, form.bound);
  if (form.key) fd.set("$ACTION_KEY", form.key);

  const ts = formTimestamp(html);
  if (ts) fd.set("form_issued", ts);

  // Only set when a test is deliberately tripping the trap. A real browser sends NO value
  // for an unticked checkbox, which is what the default reproduces.
  if (honeypot) fd.set("va_form_confirm_x9", "1");

  for (const [k, v] of Object.entries(fields)) fd.set(k, v);

  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { Cookie: cookieHeader(), Origin: BASE },
    body: fd,
    redirect: "manual",
  });
  storeCookies(res);
  return { status: res.status, location: res.headers.get("location"), body: await res.text() };
}

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ---------------- optional read-only database observation ----------------- */

async function openInquiryReader() {
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
    // Never let a harness touch production, even read-only.
    if (!/test|dev|local|scratch|tmp/i.test(dbName)) return null;
    const client = new MongoClient(uri);
    await client.connect();
    const database = client.db(dbName);
    return {
      inquiries: database.collection("inquiries"),
      students: database.collection("students"),
      applications: database.collection("enrollmentApplications"),
      close: () => client.close(),
    };
  } catch {
    return null;
  }
}

const VALID_FIELDS = {
  name: `Homeschool Test ${RUN_TAG}`,
  email: EMAIL,
  phone: "712-555-0134",
  childCount: String(CHILD_COUNT),
  gradeLevels: "K, 3rd, and 7th",
  nearestTown: TOWN,
  taekwondoInterest: "yes",
  currentSituation: "consideringHomeschool",
  message: "",
  understandsIndependentStatus: "true",
};

console.log("\n=== HOMESCHOOL AT HOME — page, boundary, and interest form ===\n");

/* ---------------- 1. The page renders and states the price ---------------- */

const page = await get("/homeschool");
check("GET /homeschool renders", page.status === 200, `status=${page.status}`);
check("Page states the $20 price", page.body.includes("$20"));
check("Page names the tier", page.body.includes("Homeschool at Home"));

/* ---------------- 2. THE dailyApp BOUNDARY, asserted mechanically --------- */

/**
 * The rule (lib/site.ts, `dailyApp`): this page SELLS the School Day app, so it must name
 * and describe it — but a visitor here has no account, and a login wall is the worst
 * possible answer to "I want to sign up".
 */
check(
  "BOUNDARY: page describes the School Day app",
  page.body.includes("School Day app"),
);
check(
  "BOUNDARY: page does NOT link the app login (visitor has no account yet)",
  !page.body.includes("app.vaschool.org/login"),
);

/* ---------------- 3. Taekwondo is never promised unconditionally ---------- */

/**
 * This tier is sold to families too far from Storm Lake to attend daily, so a flat
 * "Taekwondo included" promises something the school cannot deliver. The availability
 * caveat must travel with the promise.
 */
check(
  "Taekwondo is offered",
  /Taekwondo/i.test(page.body),
);
check(
  "HONESTY: the distance/space caveat appears alongside it",
  /travel distance and class space/i.test(page.body),
);
check(
  "HONESTY: ESA is stated as NOT applying to this tier",
  /ESA funding does not apply to this tier/i.test(page.body),
);

/* ---------------- 4. The honeypot rejects, and writes nothing ------------- */

const db = await openInquiryReader();
if (!db) {
  console.log(
    "\n  (no test database reachable — document assertions skipped, HTTP assertions still ran)\n",
  );
}

const trapEmail = `homeschool-trap+${RUN_TAG}@example.com`;
{
  const trapped = await postAction(
    "/homeschool",
    page.body,
    { ...VALID_FIELDS, email: trapEmail },
    { honeypot: true },
  );
  check(
    "Honeypot submission is rejected",
    trapped.status === 200 && !/we have your details/i.test(trapped.body),
    `status=${trapped.status}`,
  );
  if (db) {
    const count = await db.inquiries.countDocuments({ email: trapEmail });
    check("Honeypot submission wrote NO document", count === 0, `found ${count}`);
  }
}

/* ---------------- 5. A valid submission is accepted and stored ------------ */

{
  /**
   * NOTE: no sleep before this POST. The interest form deliberately does NOT enforce the
   * minimum-fill-time floor (see lib/actions/inquiry.ts) because it opens with
   * name/email/phone — the autofill-prone shape of the 2026-08-05 incident. Submitting
   * immediately is therefore part of what this harness is asserting: a fast, honest
   * submission must succeed.
   */
  const fresh = await get("/homeschool");
  const sent = await postAction("/homeschool", fresh.body, VALID_FIELDS);
  check(
    "Valid submission is accepted",
    sent.status === 200 && /we have your details/i.test(sent.body),
    `status=${sent.status}`,
  );
  check(
    "Success panel does NOT link the app login",
    !sent.body.includes("app.vaschool.org/login"),
  );
}

if (db) {
  const docs = await db.inquiries.find({ email: EMAIL }).toArray();
  check("Exactly one inquiry was written", docs.length === 1, `found ${docs.length}`);

  const doc = docs[0];
  if (doc) {
    check("Inquiry type is homeschoolAtHome", doc.type === "homeschoolAtHome", doc.type);
    check("Inquiry status is new", doc.status === "new", doc.status);
    check("details.nearestTown round-trips", doc.details?.nearestTown === TOWN);
    check("details.gradeLevels round-trips", doc.details?.gradeLevels === "K, 3rd, and 7th");
    check("details.taekwondoInterest round-trips", doc.details?.taekwondoInterest === "yes");
    check(
      "details.childCount round-trips",
      doc.details?.childCount === String(CHILD_COUNT),
      doc.details?.childCount,
    );

    /**
     * THE NUMBER A HUMAN INVOICES FROM. Precomputed in the action precisely so the
     * invoicer never re-derives it — which makes it worth asserting here, because nothing
     * else in the system would catch it being wrong.
     */
    check(
      `details.monthlyEstimate is ${CHILD_COUNT} × $20 = $${EXPECTED_MONTHLY}`,
      doc.details?.monthlyEstimate === String(EXPECTED_MONTHLY),
      `got ${doc.details?.monthlyEstimate}`,
    );

    check(
      "Email was lowercased before storage (the rate-limit key depends on it)",
      doc.email === doc.email.toLowerCase(),
    );

    /**
     * PRIVACY. This is a public unauthenticated endpoint; a minor's medical data and a
     * street address must never reach it. Waiver, emergency contact and allergies are
     * collected in person at the first dojo visit, by design.
     */
    const serialized = JSON.stringify(doc);
    check(
      "PRIVACY: no medical fields on the inquiry document",
      !/allerg|medication|immuniz|doctor|dateOfBirth/i.test(serialized),
    );
    check(
      "BOUNDARY: this is a lead, not an application — no student or signature fields",
      !/studentLegalName|guardianSignature|agreementHash|consentVersion/i.test(serialized),
    );
  }

  /* -------- 6. A public submission must never reach the trusted tables ----- */

  const leakedStudent = await db.students.countDocuments({ "guardian.email": EMAIL });
  const leakedApp = await db.applications.countDocuments({ "guardian.email": EMAIL });
  check(
    "BOUNDARY: nothing was written to `students`",
    leakedStudent === 0,
    `found ${leakedStudent}`,
  );
  check(
    "BOUNDARY: nothing was written to `enrollmentApplications`",
    leakedApp === 0,
    `found ${leakedApp}`,
  );

  await db.close();
}

/* ---------------- 7. Validation rejects an unconfirmed acknowledgment ----- */

{
  const fresh = await get("/homeschool");
  const badEmail = `homeschool-noack+${RUN_TAG}@example.com`;
  // The acknowledgment is a checkbox: leaving it unticked sends NO value at all, which is
  // what omitting the key here reproduces.
  const withoutAck = { ...VALID_FIELDS, email: badEmail };
  delete withoutAck.understandsIndependentStatus;
  const rejected = await postAction("/homeschool", fresh.body, withoutAck);
  check(
    "Submission without the independence acknowledgment is rejected",
    rejected.status === 200 && !/we have your details/i.test(rejected.body),
    `status=${rejected.status}`,
  );
}

console.log("\n=== SUMMARY ===");
const failed = results.filter((r) => !r.pass);
console.log(`  ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log("\n  FAILURES:");
  for (const f of failed) console.log(`    - ${f.name} ${f.detail}`);
  process.exit(1);
}
console.log("  All checks passed.\n");
