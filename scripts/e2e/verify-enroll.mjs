/**
 * End-to-end verification of the enrollment funnel via the progressive-enhancement
 * (no-JavaScript) path. Drives real server actions exactly as a browser with JS
 * disabled would: multipart POSTs carrying React's $ACTION_* bookkeeping fields.
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// These harnesses CREATE applications and students. Refusing anything but a local
// target is what keeps a stray E2E_BASE_URL from writing fixtures into production.
if (!BASE.startsWith("http://localhost") && !BASE.startsWith("http://127.0.0.1")) {
  console.error(`
  REFUSING TO RUN against ${BASE}. These harnesses write data and only run locally.
`);
  process.exit(1);
}
// Unique per run: the enrollment submit is also capped PER GUARDIAN EMAIL (8/day), so a
// fixed address makes the suite unrepeatable after a few runs.
const RUN_TAG = Date.now().toString(36);

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
  const body = await res.text();
  return { status: res.status, location: res.headers.get("location"), body };
}

/** Extracts the server action id from a rendered form. */
function actionId(html) {
  const m = html.match(/name="\$ACTION_1:0" value="([^"]+)"/);
  if (!m) return null;
  return JSON.parse(m[1].replace(/&quot;/g, '"')).id;
}

/** Extracts the signed anti-abuse timestamp the page issued. */
function formTimestamp(html) {
  const m = html.match(/name="form_issued"[^>]*value="([^"]+)"/);
  return m ? m[1] : null;
}

/** Extracts the bound previous-state argument. */
function boundState(html) {
  const m = html.match(/name="\$ACTION_1:1" value="([^"]+)"/);
  return m ? m[1].replace(/&quot;/g, '"') : '[{"ok":false}]';
}

async function postAction(path, html, fields) {
  const id = actionId(html);
  if (!id) throw new Error(`no action id found on ${path}`);

  const fd = new FormData();
  fd.set("$ACTION_REF_1", "");
  fd.set("$ACTION_1:0", JSON.stringify({ id, bound: "$@1" }));
  fd.set("$ACTION_1:1", boundState(html));

  const key = html.match(/name="[$]ACTION_KEY" value="([^"]*)"/);
  if (key) fd.set("$ACTION_KEY", key[1]);

  const ts = formTimestamp(html);
  if (ts) fd.set("form_issued", ts);
  // Honeypot deliberately NOT set — an unticked checkbox submits no value at all,
  // which is exactly what a real browser sends.

  for (const [k, v] of Object.entries(fields)) fd.set(k, v);

  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { Cookie: cookieHeader(), Origin: BASE },
    body: fd,
    redirect: "manual",
  });
  storeCookies(res);
  const body = await res.text();
  return { status: res.status, location: res.headers.get("location"), body };
}

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

/**
 * Extracts the server's own form-level error text from a re-rendered page.
 *
 * A rejected server action returns 200 with the form redisplayed, so the status alone
 * says "refused" without saying why. These harnesses used to stop there, which turned
 * every rate-limit trip into a mystery.
 */
function serverError(html) {
  const patterns = [
    /Too many[^<]*/i,
    /could not process[^<]*/i,
    /Please (?:wait|reload)[^<]*/i,
    /<p[^>]*role="alert"[^>]*>([^<]+)</i,
    /aria-live="[^"]*"[^>]*>\s*<[^>]*>([^<]+)</i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return (m[1] ?? m[0]).trim().slice(0, 200);
  }
  return "no form-level error found in the response";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The timing check requires >2s between form issue and submit. */
async function submitStep(path, fields, label) {
  const page = await get(path);
  if (page.status !== 200) {
    check(label, false, `page returned ${page.status}`);
    return null;
  }
  await sleep(2200);
  const res = await postAction(path, page.body, fields);
  return res;
}

console.log("\n=== ENROLLMENT FUNNEL — no-JS path ===\n");

// 1. Start page
const start = await get("/enroll");
check("GET /enroll renders", start.status === 200);

// 2. Begin — creates draft + sets signed cookie
await sleep(2200);
const begun = await postAction("/enroll", start.body, {});
check(
  "Begin creates draft and redirects to first step",
  begun.status === 303 && cookies.has("va_enroll_draft"),
  `status=${begun.status} cookie=${cookies.has("va_enroll_draft")}`,
);

// 3. Deep-link protection: a step with no draft should bounce. (Tested later.)

// 4. Walk the wizard
const student = await submitStep(
  "/enroll/student",
  {
    studentLegalName: "Test Student Alpha",
    dateOfBirth: "2014-04-11",
    gradeLevel: "Grade 6",
    requestedCohort: "middle",
    enrollmentStartDate: "2026-09-01",
  },
  "student step",
);
check("Student step accepted", student?.status === 303, `status=${student?.status}`);

const guardian = await submitStep(
  "/enroll/guardian",
  {
    guardianName: "Test Guardian",
    guardianAddress: "1 Test Lane, Storm Lake, IA 50588",
    guardianPhone: "712-555-0142",
    guardianEmail: `verify-alpha+${RUN_TAG}@example.com`,
    emergencyContactName: "",
    emergencyContactPhone: "",
  },
  "guardian step",
);
check("Guardian step accepted", guardian?.status === 303);

const funding = await submitStep(
  "/enroll/funding",
  { esaElection: "intendsToApply" },
  "funding step",
);
check("Funding step accepted", funding?.status === 303);

const medical = await submitStep(
  "/enroll/medical",
  {
    conditionsAndAllergies: "Peanut allergy",
    medications: "",
    doctorName: "Dr Test",
    doctorPhone: "712-555-0199",
    immunizationStatus: "recordsOnFile",
  },
  "medical step",
);
check("Medical step accepted", medical?.status === 303);

// --- Acknowledgments: first try with one MISSING, which must be rejected.
const ackKeys = [
  "masteryProgression",
  "taekwondoRequired",
  "graduationEarned",
  "attendanceCommitment",
  "behavioralFramework",
  "monthlyContribution",
  "activityConsent",
  "recordsConfidentiality",
];

const partial = Object.fromEntries(ackKeys.slice(0, 7).map((k) => [k, "true"]));
const ackPartial = await submitStep(
  "/enroll/acknowledgments",
  partial,
  "acknowledgments (incomplete)",
);
check(
  "SECURITY: 7 of 8 acknowledgments is REJECTED",
  ackPartial?.status === 200 && ackPartial?.location === null,
  `status=${ackPartial?.status} (200 = re-rendered with errors, not advanced)`,
);

const allAcks = Object.fromEntries(ackKeys.map((k) => [k, "true"]));
const ackFull = await submitStep(
  "/enroll/acknowledgments",
  allAcks,
  "acknowledgments (complete)",
);
check("All 8 acknowledgments accepted", ackFull?.status === 303);

const media = await submitStep(
  "/enroll/media",
  { mediaRelease: "noConsent" },
  "media step",
);
check("Media step accepted", media?.status === 303);

// 5. Review page shows the entered data
const review = await get("/enroll/review");
check(
  "Review page shows submitted data",
  review.status === 200 && review.body.includes("Test Student Alpha"),
);
check(
  "Review reflects the no-consent media choice",
  review.body.includes("Does NOT consent"),
);

// 6. HONEYPOT test on the sign page
const signPage = await get("/enroll/sign");
check("Sign page renders", signPage.status === 200);
await sleep(2200);
const honeypotTrap = await postAction("/enroll/sign", signPage.body, {
  typedName: "Bot Filler",
  intentAffirmed: "true",
  va_form_confirm_x9: "1", // bot ticks the hidden checkbox
});
check(
  "SECURITY: honeypot submission is REJECTED",
  honeypotTrap.status === 200 && honeypotTrap.location === null,
  `status=${honeypotTrap.status}`,
);

// 7. TIMING test — submit instantly, without waiting out MIN_FILL_MS
const signPage2 = await get("/enroll/sign");
const tooFast = await postAction("/enroll/sign", signPage2.body, {
  typedName: "Too Fast",
  intentAffirmed: "true",
});
check(
  "SECURITY: sub-2-second submission is REJECTED",
  tooFast.status === 200 && tooFast.location === null,
  `status=${tooFast.status}`,
);

// 8. MISSING INTENT test — a signature without the intent affirmation
const signPage3 = await get("/enroll/sign");
await sleep(2200);
const noIntent = await postAction("/enroll/sign", signPage3.body, {
  typedName: "No Intent Given",
});
check(
  "SECURITY: signature without intent affirmation is REJECTED",
  noIntent.status === 200 && noIntent.location === null,
  `status=${noIntent.status}`,
);

// 9. Legitimate signature
const signPage4 = await get("/enroll/sign");
await sleep(2200);
const submitted = await postAction("/enroll/sign", signPage4.body, {
  typedName: "Test Guardian",
  intentAffirmed: "true",
});
check(
  "Valid signature submits successfully",
  submitted.status === 303,
  submitted.status === 303
    ? `status=${submitted.status} location=${submitted.location}`
    : `status=${submitted.status} — ${serverError(submitted.body)}`,
);
check(
  "Draft cookie retained after submit (sibling carry-over needs it)",
  cookies.has("va_enroll_draft"),
  `cookie present=${cookies.has("va_enroll_draft")}`,
);

// 10. Confirmation page leaks no PII
const done = await get("/enroll/submitted");
check("Confirmation page renders", done.status === 200);
check(
  "PRIVACY: confirmation page contains NO student name",
  !done.body.includes("Test Student Alpha"),
);

// 11. Deep-link with no draft bounces to the start
const orphan = await get("/enroll/medical");
check(
  "Deep-link without a draft redirects to /enroll",
  orphan.status === 307 && (orphan.location ?? "").endsWith("/enroll"),
  `status=${orphan.status} location=${orphan.location}`,
);

console.log("\n=== SUMMARY ===");
const failed = results.filter((r) => !r.pass);
console.log(`  ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log("\n  FAILURES:");
  for (const f of failed) console.log(`    - ${f.name} ${f.detail}`);
  process.exit(1);
}
console.log("  All checks passed.\n");
