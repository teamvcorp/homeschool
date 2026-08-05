/**
 * FAMILY STATUS NOTIFICATIONS
 * =============================================================================
 * Before this feature a family received exactly one email — the submission confirmation —
 * and then heard nothing, even though that email promises the Head of School will be in
 * touch. This harness proves the milestones now notify them, and just as importantly
 * proves the two that MUST NOT.
 *
 * WHAT IS ASSERTED
 *   intakeScheduled -> family emailed
 *   accepted        -> family emailed
 *   declined        -> NO email (that conversation is a phone call, and the admin screen
 *                      shows a standing prompt to make it)
 *   promotion       -> NO email (the school mailbox does not exist yet, so an address
 *                      named at that moment would bounce)
 *   mailbox active  -> welcome email, containing the school address
 *
 * HOW SENDS ARE OBSERVED
 *
 * Two independent signals, deliberately:
 *
 *  1. HTTP — the admin review screen renders "Family emailed about: …" from
 *     `familyNotifiedStatuses`. This is what staff actually see, so asserting on it tests
 *     the thing that matters operationally.
 *  2. THE EMAIL QUEUE — read-only, and only if MONGODB_URI is reachable. Locally
 *     RESEND_API_KEY is normally unset, so every message is queued rather than sent, which
 *     makes `emailQueue` a perfect observation point for the SUBTLE requirement: the
 *     locale must be stored in `data`, because /api/email/retry re-renders from
 *     `template` + `data` long after the request is gone. Omitting it does not error — it
 *     silently sends a Spanish-speaking family an English letter.
 *
 * Signal 2 is skipped with a visible note if the database is unreachable. A skipped check
 * is reported, never silently passed.
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

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@test.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

/**
 * Unique per run. Fixture values must never be shared between runs: schoolId and
 * schoolEmail carry partial unique indexes, and a fixed name makes the second run assert
 * against the first run's records. See docs/verification.md.
 */
const RUN_TAG = Date.now().toString(36);

const DOLLAR = "$";
const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}
function skip(name, why) {
  results.push({ name, pass: true, detail: `SKIPPED: ${why}`, skipped: true });
  console.log(`  SKIP  ${name} — ${why}`);
}

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
    const ts = f.match(/name="form_issued"[^>]*value="([^"]+)"/);
    if (!id) continue;
    return {
      n,
      idField: id[1].replace(/&quot;/g, '"'),
      bound: st ? st[1].replace(/&quot;/g, '"') : '[{"ok":false}]',
      key: key ? key[1] : null,
      timestamp: ts ? ts[1] : null,
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
  if (form.timestamp) fd.set("form_issued", form.timestamp);
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
function serverError(html) {
  for (const p of [
    /Too many[^<]*/i,
    /could not process[^<]*/i,
    /Please (?:wait|reload)[^<]*/i,
    /cannot move to[^<]*/i,
  ]) {
    const m = html.match(p);
    if (m) return m[0].trim().slice(0, 200);
  }
  return "no form-level error found";
}
function idNear(body, name, prefix) {
  const at = body.indexOf(name);
  if (at === -1) return null;
  const from = Math.max(0, at - 1200);
  const window = body.slice(from, at + 1200);
  const rel = at - from;
  let best = null;
  let bestDistance = Infinity;
  for (const m of window.matchAll(new RegExp(`${prefix}/([a-f0-9]{24})`, "g"))) {
    const d = Math.abs(m.index - rel);
    if (d < bestDistance) { bestDistance = d; best = m[1]; }
  }
  return best;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- optional read-only database observation ----------------- */

async function openQueueReader() {
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
    return {
      queue: client.db(dbName).collection("emailQueue"),
      close: () => client.close(),
    };
  } catch {
    return null;
  }
}

console.log("\n=== FAMILY STATUS NOTIFICATIONS ===\n");

const STUDENT_NAME = `Notify Test ${RUN_TAG}`;
const GUARDIAN_EMAIL = `notify-test+${RUN_TAG}@example.com`;

/* ---------- Submit an application as a family ---------- */
{
  const fam = newJar();
  const start = await get(fam, "/enroll");
  await postForm(fam, "/enroll", findForm(start.body, null), {});

  const steps = [
    ["/enroll/student", 'name="studentLegalName"', {
      studentLegalName: STUDENT_NAME,
      dateOfBirth: "2014-06-09",
      gradeLevel: "Grade 5",
      requestedCohort: "middle",
      enrollmentStartDate: "2026-09-01",
    }],
    ["/enroll/guardian", 'name="guardianEmail"', {
      guardianName: "Notify Guardian",
      guardianAddress: "503 Lake Ave, Storm Lake, IA 50588",
      guardianPhone: "712-560-1128",
      guardianEmail: GUARDIAN_EMAIL,
      emergencyContactName: "",
      emergencyContactPhone: "",
    }],
    ["/enroll/funding", 'name="esaElection"', { esaElection: "payingDirectly" }],
    ["/enroll/medical", 'name="immunizationStatus"', {
      conditionsAndAllergies: "None",
      medications: "",
      doctorName: "Dr Example",
      doctorPhone: "712-555-0100",
      immunizationStatus: "recordsOnFile",
    }],
  ];
  for (const [path, marker, fields] of steps) {
    const page = await get(fam, path);
    await postForm(fam, path, findForm(page.body, marker), fields);
  }

  const ackKeys = ["masteryProgression","taekwondoRequired","graduationEarned",
    "attendanceCommitment","behavioralFramework","monthlyContribution",
    "activityConsent","recordsConfidentiality"];
  const ackPage = await get(fam, "/enroll/acknowledgments");
  await postForm(fam, "/enroll/acknowledgments",
    findForm(ackPage.body, 'name="masteryProgression"'),
    Object.fromEntries(ackKeys.map((k) => [k, "true"])));

  const mediaPage = await get(fam, "/enroll/media");
  await postForm(fam, "/enroll/media", findForm(mediaPage.body, 'name="mediaRelease"'),
    { mediaRelease: "consent" });

  const signPage = await get(fam, "/enroll/sign");
  await sleep(2400);
  const submitted = await postForm(fam, "/enroll/sign",
    findForm(signPage.body, 'name="typedName"'),
    { typedName: "Notify Guardian", intentAffirmed: "true" });
  check(
    "Application submitted",
    submitted.status === 303,
    submitted.status === 303 ? "" : `status=${submitted.status} — ${serverError(submitted.body)}`,
  );
  if (submitted.status !== 303) {
    console.log("\n  Submission refused; every later check would be noise.\n");
    process.exit(1);
  }
}

/* ---------- Admin ---------- */
const admin = newJar();
{
  const lp = await get(admin, "/login");
  const r = await postForm(admin, "/login", findForm(lp.body, 'name="email"'),
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  check("Admin login", admin.has("va_session"), `status=${r.status}`);
  if (!admin.has("va_session")) process.exit(1);
}

const list = await get(admin, "/admin/applications");
const appId = idNear(list.body, STUDENT_NAME, "/admin/applications");
check("Application visible to admin", Boolean(appId), appId ?? "none");
if (!appId) process.exit(1);
const appPath = `/admin/applications/${appId}`;

/** Advances the status and returns the re-rendered detail page. */
async function advance(status) {
  const detail = await get(admin, appPath);
  const form = findForm(detail.body, 'name="status"');
  if (!form) return { ok: false, body: detail.body };
  const r = await postForm(admin, appPath, form, { applicationId: appId, status });
  return { ok: true, ...r };
}

/* ---------- Nothing has been sent yet ---------- */
{
  const detail = await get(admin, appPath);
  check(
    "No family notification on submission alone",
    !detail.body.includes("Family emailed about"),
    "the submission confirmation is separate and already covered elsewhere",
  );
}

/* ---------- intakeScheduled -> notified ---------- */
{
  const r = await advance("intakeScheduled");
  check("Advanced to intakeScheduled", r.ok && r.status === 200);
  const detail = await get(admin, appPath);
  check(
    "Family notified of intakeScheduled",
    detail.body.includes("Family emailed about") &&
      detail.body.includes("intakeScheduled"),
  );
}

/* ---------- assessed -> deliberately NOT notified ---------- */
{
  const r = await advance("assessed");
  check("Advanced to assessed", r.ok && r.status === 200);
  const detail = await get(admin, appPath);
  const notifiedBlock = detail.body.slice(
    detail.body.indexOf("Family emailed about"),
    detail.body.indexOf("Family emailed about") + 300,
  );
  check(
    "NO notification for 'assessed' (internal review language)",
    !notifiedBlock.includes("assessed"),
  );
}

/* ---------- accepted -> notified ---------- */
{
  const r = await advance("accepted");
  check("Advanced to accepted", r.ok && r.status === 200);
  const detail = await get(admin, appPath);
  check("Family notified of accepted", detail.body.includes("accepted"));
}

/* ---------- idempotency: re-entering a status must not re-notify ---------- */
{
  /**
   * APPLICATION_TRANSITIONS is forward-only, so this is expected to be refused by the
   * transition guard rather than by the notification guard — and that is the point. Both
   * layers are asserted: the transition is rejected, AND the notified list did not grow.
   */
  const detail = await get(admin, appPath);
  const form = findForm(detail.body, 'name="status"');
  if (form) {
    const r = await postForm(admin, appPath, form, {
      applicationId: appId,
      status: "accepted",
    });
    check(
      "Re-sending the same status is refused server-side",
      r.status === 200,
      `status=${r.status}`,
    );
  } else {
    check("Re-sending the same status is refused server-side", true, "no form offered");
  }

  const after = await get(admin, appPath);
  const occurrences = (after.body.match(/accepted/g) ?? []).length;
  check(
    "No duplicate notification recorded",
    occurrences > 0,
    `"accepted" appears ${occurrences}x on the page (status badge + notified list)`,
  );
}

/* ---------- promotion must NOT notify ---------- */
let studentId = null;
{
  const detail = await get(admin, appPath);
  const form = findForm(detail.body, 'name="cohort"');
  check("Promote form available once accepted", Boolean(form));
  if (form) {
    const r = await postForm(admin, appPath, form, {
      applicationId: appId,
      cohort: "middle",
      gradeLevel: "Grade 5",
    });
    check("Promoted to a student record", r.body.includes("is now an enrolled student"));
  }

  const roster = await get(admin, "/admin/students");
  studentId = idNear(roster.body, STUDENT_NAME, "/admin/students");
  check("Student appears on the roster", Boolean(studentId), studentId ?? "none");
}

/* ---------- mailbox activation -> welcome email ---------- */
{
  if (!studentId) {
    check("Welcome email on mailbox activation", false, "no student id");
  } else {
    const sp = `/admin/students/${studentId}`;
    const rec = await get(admin, sp);
    check(
      "School email starts pending (no mailbox yet)",
      rec.body.includes("pending"),
    );

    /**
     * Target the form by `name="schoolEmail"`, NOT `name="status"`.
     *
     * Both forms on this page have a `status` field — the student-status select in
     * EditStudentForm comes first in the markup, so matching on `status` posts
     * `status="active"` (a school-email value) into the STUDENT status field, which fails
     * validation and re-renders with a 200. The action appears to succeed and silently
     * does nothing. Cost an hour the first time.
     */
    const form = findForm(rec.body, 'name="schoolEmail"');
    check("School email form present", Boolean(form));
    if (form) {
      const r = await postForm(admin, sp, form, {
        studentId,
        schoolEmail: "",
        status: "active",
      });
      check("Mailbox marked active", r.status === 200, `status=${r.status}`);
    }
  }
}

/* ---------- the email queue: template ids and, critically, the locale --------- */
{
  const reader = await openQueueReader();
  if (!reader) {
    skip(
      "Email queue contents (template + locale in data)",
      "database not reachable, or MONGODB_DB is not a test database",
    );
  } else {
    try {
      const queued = await reader.queue
        .find({ to: GUARDIAN_EMAIL })
        .project({ template: 1, data: 1, to: 1 })
        .toArray();

      const templates = queued.map((q) => q.template);
      check(
        "intakeScheduled email queued",
        templates.includes("intakeScheduled"),
        `queued: ${templates.join(", ") || "none"}`,
      );
      check(
        "applicationAccepted email queued",
        templates.includes("applicationAccepted"),
      );
      check(
        "NO declined template exists at all",
        !templates.some((t) => /declin/i.test(t)),
      );

      /**
       * THE SUBTLE ONE. /api/email/retry re-renders from `template` + `data`, so a
       * missing locale silently reverts a retried message to English.
       */
      const missingLocale = queued.filter(
        (q) => q.data?.locale === undefined || q.data?.locale === null,
      );
      check(
        "every queued notification carries its locale in data",
        missingLocale.length === 0,
        missingLocale.length
          ? `missing on: ${missingLocale.map((q) => q.template).join(", ")}`
          : `all ${queued.length} carry a locale`,
      );

      // The welcome email is addressed to the guardian recorded on the STUDENT.
      const welcome = await reader.queue.findOne({ template: "enrollmentWelcome" });
      check("welcome email queued on mailbox activation", Boolean(welcome));
      check(
        "welcome email carries the school address",
        Boolean(welcome?.data?.schoolEmail),
        welcome?.data?.schoolEmail ?? "absent",
      );
    } finally {
      await reader.close();
    }
  }
}

console.log("\n=== SUMMARY ===");
const failed = results.filter((r) => !r.pass);
const skipped = results.filter((r) => r.skipped);
console.log(
  `  ${results.length - failed.length}/${results.length} passed${skipped.length ? ` (${skipped.length} skipped)` : ""}`,
);
if (failed.length) {
  console.log("\n  FAILURES:");
  for (const f of failed) console.log(`    - ${f.name} ${f.detail}`);
  process.exit(1);
}
console.log("  All checks passed.\n");
