/**
 * Covers exactly what was reported from production:
 *
 *  1. An application advanced to "enrolled" via the STATUS DROPDOWN created no student
 *     record, and then the promote form disappeared — leaving the record permanently unable
 *     to produce a student. Audit trail proof: a statusChange accepted→enrolled with no
 *     corresponding application.promote event.
 *
 *  2. The promoted student must appear in /admin/students.
 *
 *  3. The school email must be generated as {firstName}{DD}{lastInitial}{YY}@vaschool.org,
 *     marked pending until the Office 365 mailbox exists.
 *
 *  4. An administrator must be able to edit the student record and assign a school ID.
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
 * EVERY FIXTURE VALUE IS UNIQUE PER RUN, and that is load-bearing.
 *
 * `students.schoolId` and `students.schoolEmail` both carry PARTIAL UNIQUE indexes. A
 * fixed fixture therefore only works on the first run: the second run's student collides
 * on the email (correctly resolved to `…​.2@`) and cannot be given the same school ID at
 * all. Earlier runs of this harness masked that by resolving the FIRST student link on
 * the roster — an old record from a previous run that already had a school ID — so
 * "School ID shows as unassigned initially" failed against a record that was never
 * freshly created.
 *
 * The canonical example the school specified — Lily Von Der Becke, born 16 March 2013 →
 * lily16v13@vaschool.org — is asserted directly against lib/school-email.ts, which needs
 * no database and cannot be perturbed by leftover rows. What THIS harness proves is the
 * wiring: that promotion runs the generator, stores the result, and marks it pending.
 */
const RUN = Date.now().toString(36);
const STUDENT_NAME = `Lily${RUN} Von Der Becke`;
const STUDENT_DOB = "2013-03-16";
// Same rule as lib/school-email.ts: firstName + DD + last initial + YY.
const EXPECTED_EMAIL = `lily${RUN}16v13@vaschool.org`;
const SCHOOL_ID = `VA-2026-${RUN}`;

// Unique per run: the enrollment submit is also capped PER GUARDIAN EMAIL
// (8/day), so a fixed address makes the suite unrepeatable after a few runs.
const RUN_TAG = Date.now().toString(36);

const DOLLAR = "$";
const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
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

console.log("\n=== PROMOTE TRAP + SCHOOL IDENTITY ===\n");

/* ---------- Submit an application as a family ---------- */
const fam = newJar();
{
  const start = await get(fam, "/enroll");
  await postForm(fam, "/enroll", findForm(start.body, null), {});

  const steps = [
    ["/enroll/student", 'name="studentLegalName"', {
      studentLegalName: STUDENT_NAME,
      dateOfBirth: STUDENT_DOB,
      gradeLevel: "Grade 6",
      requestedCohort: "middle",
      enrollmentStartDate: "2026-09-01",
    }],
    ["/enroll/guardian", 'name="guardianEmail"', {
      guardianName: "Robert Von Der Becke",
      guardianAddress: "503 Lake Ave, Storm Lake, IA 50588",
      guardianPhone: "712-560-1128",
      guardianEmail: `promote-test+${RUN_TAG}@example.com`,
      emergencyContactName: "",
      emergencyContactPhone: "",
    }],
    ["/enroll/funding", 'name="esaElection"', { esaElection: "intendsToApply" }],
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
  await postForm(fam, "/enroll/acknowledgments", findForm(ackPage.body, 'name="masteryProgression"'),
    Object.fromEntries(ackKeys.map((k) => [k, "true"])));

  const mediaPage = await get(fam, "/enroll/media");
  await postForm(fam, "/enroll/media", findForm(mediaPage.body, 'name="mediaRelease"'),
    { mediaRelease: "consent" });

  const signPage = await get(fam, "/enroll/sign");
  await sleep(2400);
  const submitted = await postForm(fam, "/enroll/sign", findForm(signPage.body, 'name="typedName"'),
    { typedName: "Robert Von Der Becke", intentAffirmed: "true" });
  check(
    "Family application submitted",
    submitted.status === 303,
    submitted.status === 303 ? "" : `status=${submitted.status} — ${serverError(submitted.body)}`,
  );
  // A submit that returns 200 was REJECTED and re-rendered with errors. Guessing why
  // wastes time, so surface the server's own message: the usual causes are the per-IP
  // submit cap (10/hr, easily hit by repeated harness runs) and the minimum fill time.
  if (submitted.status !== 303) {
    console.log("\n  Submission was refused; not continuing — every later check would be noise.\n");
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

/** Nearest record id to a named row — see the note on fixture uniqueness above. */
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

const list = await get(admin, "/admin/applications");
const appId = idNear(list.body, STUDENT_NAME, "/admin/applications");
check("Application visible to admin", Boolean(appId), appId ?? "none");
if (!appId) process.exit(1);
const appPath = `/admin/applications/${appId}`;

/* ---------- Advance to accepted ---------- */
let detail = await get(admin, appPath);
for (const next of ["intakeScheduled", "assessed", "accepted"]) {
  const f = findForm(detail.body, 'name="status"');
  const r = await postForm(admin, appPath, f, { applicationId: appId, status: next, notes: "" });
  check(`Advanced to ${next}`, r.body.includes(`Status updated to ${next}`));
  detail = await get(admin, appPath);
}

/* ---------- THE TRAP: "enrolled" must NOT be selectable ---------- */
{
  const f = findForm(detail.body, 'name="status"');
  const options = [...(f?.html ?? "").matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
  check(
    'BUG FIXED: "enrolled" is NOT offered in the status dropdown',
    !options.includes("enrolled"),
    `options=${JSON.stringify(options)}`,
  );

  // And a forged POST naming it must be refused server-side.
  const r = await postForm(admin, appPath, f, {
    applicationId: appId,
    status: "enrolled",
    notes: "",
  });
  check(
    "SECURITY: a forged enrolled transition is refused server-side",
    r.body.includes("cannot move to") && !r.body.includes("Status updated to enrolled"),
    `post=${r.status}`,
  );
  detail = await get(admin, appPath);
}

/* ---------- Promote ---------- */
let studentId = null;
{
  const f = findForm(detail.body, 'name="cohort"');
  check("Promote form is available", Boolean(f));
  if (f) {
    const r = await postForm(admin, appPath, f, {
      applicationId: appId,
      cohort: "middle",
      gradeLevel: "Grade 6",
    });
    check("Promoted to a student record", r.body.includes("is now an enrolled student"),
      `post=${r.status}`);
  }
}

/* ---------- THE REPORTED SYMPTOM: does the student show up? ---------- */
{
  const roster = await get(admin, "/admin/students");
  check("BUG FIXED: promoted student APPEARS in student records",
    roster.body.includes(STUDENT_NAME));
  // Resolve THIS run's student, not the first link on the roster. The roster wraps the
  // name in its link, so the id is the nearest occurrence to the unique fixture name.
  studentId = (() => {
    const at = roster.body.indexOf(STUDENT_NAME);
    if (at === -1) return null;
    const from = Math.max(0, at - 1200);
    const window = roster.body.slice(from, at + 1200);
    const rel = at - from;
    let best = null;
    let bestDistance = Infinity;
    for (const m of window.matchAll(/\/admin\/students\/([a-f0-9]{24})/g)) {
      const d = Math.abs(m.index - rel);
      if (d < bestDistance) { bestDistance = d; best = m[1]; }
    }
    return best;
  })();
  check("Student id extracted", Boolean(studentId), studentId ?? "none");
  check("School email shown on the roster", roster.body.includes(EXPECTED_EMAIL),
    `expected ${EXPECTED_EMAIL}`);
}

/* ---------- School identity ---------- */
if (studentId) {
  const sp = `/admin/students/${studentId}`;
  let rec = await get(admin, sp);
  check("Student record loads", rec.status === 200);
  check(`School email generated as ${EXPECTED_EMAIL}`, rec.body.includes(EXPECTED_EMAIL));
  check("School email marked PENDING (no Office 365 mailbox yet)",
    rec.body.includes("pending"));
  check("School ID shows as unassigned initially",
    rec.body.includes("not assigned"));

  /* ---------- Edit the record: assign a school ID ---------- */
  {
    const f = findForm(rec.body, 'name="schoolId"');
    check("Edit-student form present", Boolean(f));
    if (f) {
      const r = await postForm(admin, sp, f, {
        studentId,
        legalName: STUDENT_NAME,
        dateOfBirth: STUDENT_DOB,
        gradeLevel: "Grade 7",
        cohort: "middle",
        enrollmentStartDate: "2026-09-01",
        status: "enrolled",
        schoolId: SCHOOL_ID,
        guardianName: "Robert Von Der Becke",
        guardianEmail: `promote-test+${RUN_TAG}@example.com`,
        guardianPhone: "712-560-1128",
        guardianAddress: "503 Lake Ave, Storm Lake, IA 50588",
        emergencyContactName: "",
        emergencyContactPhone: "",
        conditionsAndAllergies: "None",
        medications: "",
        doctorName: "Dr Example",
        doctorPhone: "712-555-0100",
        immunizationStatus: "recordsOnFile",
        mediaRelease: "consent",
        notes: "",
      });
      check("Student record saved", r.body.includes("saved") || r.body.includes("Saved"),
        `post=${r.status}`);
      rec = await get(admin, sp);
      check("School ID persisted", rec.body.includes(SCHOOL_ID), SCHOOL_ID);
      check("Grade change persisted", rec.body.includes("Grade 7"));
    }
  }

  /* ---------- Activate the mailbox ---------- */
  {
    const f = findForm(rec.body, 'name="schoolEmail"');
    check("School email form present", Boolean(f));
    if (f) {
      const r = await postForm(admin, sp, f, {
        studentId,
        schoolEmail: EXPECTED_EMAIL,
        status: "active",
      });
      check("Mailbox marked active", r.body.includes("active") || r.body.includes("Saved"),
        `post=${r.status}`);
      rec = await get(admin, sp);
      check("Status now shows active, not pending",
        rec.body.includes(">active<") || rec.body.includes("active"));
    }
  }
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
