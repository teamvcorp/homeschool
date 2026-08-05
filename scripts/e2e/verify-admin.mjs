/**
 * End-to-end verification of the admin review flow and the authorization boundaries:
 * that a public application cannot become a student without an authenticated decision,
 * and that record scope prevents cross-family access.
 *
 * Drives real server actions over the no-JavaScript progressive-enhancement path.
 * Assertions read each action's own returned message — the authoritative signal —
 * rather than pattern-matching rendered markup.
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
const PARENT_EMAIL = "scope-test-parent@example.com";
const PARENT_PASSWORD = "ScopeTestPassword123!";

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
const hdr = (jar) => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

function store(jar, r) {
  for (const l of r.headers.getSetCookie?.() ?? []) {
    const [p] = l.split(";");
    const i = p.indexOf("=");
    if (i > 0) {
      const k = p.slice(0, i).trim();
      const v = p.slice(i + 1).trim();
      if (v === "" || /expires=Thu, 01 Jan 1970/i.test(l)) jar.delete(k);
      else jar.set(k, v);
    }
  }
}

async function get(jar, path) {
  const r = await fetch(BASE + path, { headers: { Cookie: hdr(jar) }, redirect: "manual" });
  store(jar, r);
  return { status: r.status, location: r.headers.get("location"), body: await r.text() };
}

/**
 * Locates a form by a marker string and captures its action fields VERBATIM.
 *
 * Two things that must not be improvised: React's bound-reference token (rebuilding it
 * only works by luck when the form is first on the page) and $ACTION_KEY (omitting it
 * makes the action silently not execute).
 */
function findForm(html, marker) {
  for (const f of html.match(/<form[\s\S]*?<\/form>/g) ?? []) {
    // A null marker means "first form with an action" — the /enroll start button has
    // no distinguishing field. Without the null guard, includes(null) coerces to
    // includes("null") and never matches.
    if (marker && !f.includes(marker)) continue;
    const nMatch = f.match(/name="[$]ACTION_REF_(\d+)"/);
    if (!nMatch) continue;
    const n = nMatch[1];
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
      hasHoneypot: f.includes("company_website"),
    };
  }
  return null;
}

async function postForm(jar, path, form, fields) {
  const fd = new FormData();
  fd.set(`${DOLLAR}ACTION_REF_${form.n}`, "");
  fd.set(`${DOLLAR}ACTION_${form.n}:0`, form.idField);
  fd.set(`${DOLLAR}ACTION_${form.n}:1`, form.bound);
  if (form.key) fd.set(`${DOLLAR}ACTION_KEY`, form.key);
  if (form.timestamp) fd.set("form_issued", form.timestamp);
  if (form.hasHoneypot) fd.set("company_website", "");
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);

  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { Cookie: hdr(jar), Origin: BASE },
    body: fd,
    redirect: "manual",
  });
  store(jar, r);
  return { status: r.status, location: r.headers.get("location"), body: await r.text() };
}

async function login(jar, email, password) {
  const page = await get(jar, "/login");
  const form = findForm(page.body, 'name="email"');
  if (!form) throw new Error("login form not found");
  return postForm(jar, "/login", form, { email, password });
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

console.log("\n=== ADMIN REVIEW FLOW & AUTHORIZATION BOUNDARIES ===\n");

// ---------- Unauthenticated probes ----------
const anon = newJar();
for (const path of ["/admin", "/admin/applications", "/admin/students", "/portal"]) {
  const r = await get(anon, path);
  check(`SECURITY: anonymous ${path} redirected`, r.status === 307, `status=${r.status}`);
}

/* ---------- Seed THIS RUN's fixture application -----------------------------
 * Previously this harness reviewed whichever application happened to be newest,
 * then asserted on fixture values ("Peanut allergy", media non-consent) that only
 * belonged to an application an earlier run had created. Running the enrollment or
 * bugfix harness first therefore pointed it at a different record and produced four
 * spurious failures — and worse, it MUTATED that record (advancing status, promoting).
 *
 * So it now submits its own application and reviews that. Self-contained, so harness
 * order no longer matters and a rerun never inherits half-advanced state.
 * -------------------------------------------------------------------------- */
/**
 * Unique per run. Every previous run left a "Test Student Alpha" behind, so a fixed
 * name cannot identify THIS run's record — and `match()` returning the first id on
 * the page silently pointed the assertions at an old student whose media release
 * differed. A unique name makes every lookup below unambiguous.
 */
const RUN = Date.now().toString(36);
const STUDENT_NAME = `Test Student Alpha ${RUN}`;

/**
 * Resolves the record id belonging to a NAMED row, rather than the first id on the page.
 *
 * Direction-agnostic on purpose, because the two tables disagree: the student roster
 * wraps the name in its link (id BEFORE the name), while the applications table puts a
 * trailing "Review" link in the last cell (id AFTER the name). Picking the nearest match
 * on either side handles both without encoding either layout.
 */
function idNear(body, name, prefix) {
  const at = body.indexOf(name);
  if (at === -1) return null;
  const from = Math.max(0, at - 1200);
  const window = body.slice(from, at + 1200);
  const rel = at - from;

  let best = null;
  let bestDistance = Infinity;
  for (const m of window.matchAll(new RegExp(`${prefix}/([a-f0-9]{24})`, "g"))) {
    const distance = Math.abs(m.index - rel);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = m[1];
    }
  }
  return best;
}
{
  const fam = newJar();
  const start = await get(fam, "/enroll");
  await postForm(fam, "/enroll", findForm(start.body, null), {});

  const steps = [
    ["/enroll/student", 'name="studentLegalName"', {
      studentLegalName: STUDENT_NAME,
      dateOfBirth: "2014-05-02",
      gradeLevel: "Grade 6",
      requestedCohort: "middle",
      enrollmentStartDate: "2026-09-01",
    }],
    ["/enroll/guardian", 'name="guardianEmail"', {
      guardianName: "Alpha Guardian",
      guardianAddress: "503 Lake Ave, Storm Lake, IA 50588",
      guardianPhone: "712-560-1128",
      guardianEmail: `admin-harness+${RUN_TAG}@example.com`,
      emergencyContactName: "Beta Guardian",
      emergencyContactPhone: "712-555-0199",
    }],
    ["/enroll/funding", 'name="esaElection"', { esaElection: "intendsToApply" }],
    // "Peanut allergy" is asserted on later — it proves the admin view exposes
    // medical detail to a role entitled to it, and the DTO withholds it otherwise.
    ["/enroll/medical", 'name="immunizationStatus"', {
      conditionsAndAllergies: "Peanut allergy",
      medications: "Epinephrine auto-injector",
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

  // noConsent on purpose: the "do not use this student's image" warning must be
  // impossible to miss on both the review screen and the student file.
  const mediaPage = await get(fam, "/enroll/media");
  await postForm(fam, "/enroll/media", findForm(mediaPage.body, 'name="mediaRelease"'),
    { mediaRelease: "noConsent" });

  const signPage = await get(fam, "/enroll/sign");
  await sleep(2400); // clears the minimum-fill-time gate on final submit
  const submitted = await postForm(fam, "/enroll/sign",
    findForm(signPage.body, 'name="typedName"'),
    { typedName: "Alpha Guardian", intentAffirmed: "true" });
  check(
    "Fixture application submitted",
    submitted.status === 303,
    submitted.status === 303
      ? ""
      : `status=${submitted.status} — ${serverError(submitted.body)}`,
  );
}

// ---------- Admin login ----------
const admin = newJar();
const loggedIn = await login(admin, ADMIN_EMAIL, ADMIN_PASSWORD);
check("Admin login succeeds", loggedIn.status === 303 && admin.has("va_session"));
if (!admin.has("va_session")) {
  console.log("\nCannot continue without an admin session.\n");
  process.exit(1);
}

// ---------- Applications list ----------
const list = await get(admin, "/admin/applications");
check("Applications list loads", list.status === 200);
check("Test application appears", list.body.includes(STUDENT_NAME));

const appId = idNear(list.body, STUDENT_NAME, "/admin/applications");
check("Application id extracted", Boolean(appId), appId ?? "none");
if (!appId) process.exit(1);

const appPath = `/admin/applications/${appId}`;

// ---------- Detail view ----------
let detail = await get(admin, appPath);
check("Application detail loads", detail.status === 200);
check("Admin sees medical detail", detail.body.includes("Peanut allergy"));
check("Signature evidence shown", detail.body.includes("Agreement fingerprint"));
check("All 8 acknowledgments accepted", detail.body.includes("All 8 accepted"));
check(
  "Media non-consent surfaced as a warning",
  detail.body.includes("do not use this student"),
);

// ---------- Status machine (legal path) ----------
for (const next of ["intakeScheduled", "assessed", "accepted"]) {
  const form = findForm(detail.body, 'name="status"');
  if (!form) {
    check(`Status advanced to ${next}`, false, "transition form not found");
    break;
  }
  const r = await postForm(admin, appPath, form, {
    applicationId: appId,
    status: next,
    notes: "",
  });
  check(
    `Status advanced to ${next}`,
    r.body.includes(`Status updated to ${next}`),
    `post=${r.status}`,
  );
  detail = await get(admin, appPath);
}

// ---------- Illegal transition must be refused ----------
{
  const form = findForm(detail.body, 'name="status"');
  if (form) {
    // "submitted" is not a legal successor of "accepted".
    const r = await postForm(admin, appPath, form, {
      applicationId: appId,
      status: "submitted",
      notes: "",
    });
    check(
      "SECURITY: illegal status transition refused",
      r.body.includes("cannot move to") &&
        !r.body.includes("Status updated to submitted"),
      `post=${r.status}`,
    );
    detail = await get(admin, appPath);
  } else {
    check("SECURITY: illegal status transition refused", false, "form not found");
  }
}

// ---------- Countersign ----------
{
  const form = findForm(detail.body, 'name="typedName"');
  check("Countersign form present", Boolean(form));
  if (form) {
    const r = await postForm(admin, appPath, form, {
      applicationId: appId,
      typedName: "Robert Von Der Becke",
      intentAffirmed: "true",
    });
    check(
      "Countersignature recorded",
      r.body.includes("Agreement countersigned"),
      `post=${r.status}`,
    );
    detail = await get(admin, appPath);
    check(
      "SECURITY: countersign form removed after signing (no overwrite)",
      !findForm(detail.body, 'name="typedName"'),
    );
  }
}

// ---------- Promote ----------
let studentId = null;
{
  const form = findForm(detail.body, 'name="cohort"');
  check("Promote form present once accepted", Boolean(form));
  if (form) {
    const r = await postForm(admin, appPath, form, {
      applicationId: appId,
      cohort: "middle",
      gradeLevel: "Grade 6",
    });
    check(
      "Promoted to student record",
      r.body.includes("is now an enrolled student"),
      `post=${r.status}`,
    );

    const students = await get(admin, "/admin/students");
    check("Student appears on roster", students.body.includes(STUDENT_NAME));
    studentId = idNear(students.body, STUDENT_NAME, "/admin/students");
    check("Student id extracted", Boolean(studentId), studentId ?? "none");

    detail = await get(admin, appPath);
    check(
      "SECURITY: promote form gone after promotion (no double-create)",
      !findForm(detail.body, 'name="cohort"'),
    );
    check("Application marked promoted", detail.body.includes("Already promoted"));
  }
}

// ---------- Student record + record entry ----------
if (studentId) {
  const studentPath = `/admin/students/${studentId}`;
  let rec = await get(admin, studentPath);
  check("Student record loads", rec.status === 200);
  check(
    "Templates A-D all present",
    ["Template A", "Template B", "Template C", "Template D"].every((t) =>
      rec.body.includes(t),
    ),
  );
  check("Media non-consent surfaced on record", rec.body.includes("DOES NOT consent"));
  check(
    "Links back to signed agreement",
    rec.body.includes("View signed enrollment agreement"),
  );

  const today = new Date().toISOString().slice(0, 10);

  const attForm = findForm(rec.body, 'name="code"');
  if (attForm) {
    const r = await postForm(admin, studentPath, attForm, {
      studentId,
      date: today,
      code: "P",
      notes: "Recorded by automated verification",
    });
    check(
      "Template A: attendance recorded",
      r.body.includes("Attendance recorded"),
      `post=${r.status}`,
    );
    rec = await get(admin, studentPath);
  } else check("Template A: attendance recorded", false, "form not found");

  const masForm = findForm(rec.body, 'name="skill"');
  if (masForm) {
    const r = await postForm(admin, studentPath, masForm, {
      studentId,
      subject: "Mathematics",
      skill: "Two-step linear equations",
      dateMastered: today,
      assessmentMethod: "applied",
      schoolYear: "2026-2027",
      notes: "",
    });
    check(
      "Template B: mastery recorded",
      r.body.includes("Mastery recorded"),
      `post=${r.status}`,
    );
    rec = await get(admin, studentPath);
  } else check("Template B: mastery recorded", false, "form not found");

  const behForm = findForm(rec.body, 'name="targetBehavior"');
  if (behForm) {
    const r = await postForm(admin, studentPath, behForm, {
      studentId,
      period: "2026 Q3",
      pillar: "self-control",
      targetBehavior: "Emotional regulation in conflict",
      level: "4",
      notes: "Independent in familiar contexts",
    });
    check(
      "Template C: behavior recorded",
      r.body.includes("Behavioral record saved"),
      `post=${r.status}`,
    );
    rec = await get(admin, studentPath);
  } else check("Template C: behavior recorded", false, "form not found");

  const tkdForm = findForm(rec.body, 'name="requirementsDemonstrated"');
  if (tkdForm) {
    const r = await postForm(admin, studentPath, tkdForm, {
      studentId,
      rank: "Yellow Belt",
      requirementsDemonstrated: "Basic forms and the five values",
      assessmentDate: today,
      assessedBy: "Robert Von Der Becke",
    });
    check(
      "Template D: rank recorded",
      r.body.includes("Yellow Belt recorded"),
      `post=${r.status}`,
    );
    rec = await get(admin, studentPath);
  } else check("Template D: rank recorded", false, "form not found");

  check(
    "All four records display on the student file",
    rec.body.includes("Recorded by automated verification") &&
      rec.body.includes("Two-step linear equations") &&
      rec.body.includes("Emotional regulation in conflict") &&
      rec.body.includes("Yellow Belt"),
  );

  const behForm2 = findForm(rec.body, 'name="targetBehavior"');
  if (behForm2) {
    const r = await postForm(admin, studentPath, behForm2, {
      studentId,
      period: "2026 Q3",
      pillar: "self-control",
      targetBehavior: "Emotional regulation in conflict",
      level: "99",
      notes: "",
    });
    check(
      "SECURITY: out-of-range behavior level refused",
      !r.body.includes("Behavioral record saved"),
      `post=${r.status}`,
    );
  }
}

// ---------- Nonexistent id ----------
{
  const r = await get(admin, `/admin/students/${"0".repeat(24)}`);
  check("Nonexistent student id returns 404", r.status === 404, `status=${r.status}`);
}

// ---------- SCOPE: parent with no linked students ----------
{
  const parent = newJar();
  const r = await login(parent, PARENT_EMAIL, PARENT_PASSWORD);
  const authed = parent.has("va_session");
  check("Scope-test parent logged in", authed, `status=${r.status}`);

  if (authed) {
    const portal = await get(parent, "/portal");
    check("Parent portal loads", portal.status === 200);
    check(
      "PRIVACY: parent with no children sees empty state",
      portal.body.includes("No students linked"),
    );

    if (studentId) {
      const cross = await get(parent, `/portal/students/${studentId}`);
      check(
        "SECURITY: parent CANNOT read an unlinked student",
        cross.status === 404,
        `status=${cross.status}`,
      );

      const crossAgreement = await get(
        parent,
        `/portal/students/${studentId}/agreement`,
      );
      check(
        "SECURITY: parent CANNOT read an unlinked agreement",
        crossAgreement.status === 404,
        `status=${crossAgreement.status}`,
      );

      const adminStudent = await get(parent, `/admin/students/${studentId}`);
      check(
        "SECURITY: parent CANNOT reach the admin student view",
        adminStudent.status === 404 || adminStudent.status === 307,
        `status=${adminStudent.status}`,
      );
    }

    const adminList = await get(parent, "/admin/applications");
    check(
      "SECURITY: parent redirected away from /admin/applications",
      adminList.status === 307 ||
        (adminList.status === 200 &&
          !adminList.body.includes("Enrollment applications")),
      `status=${adminList.status}`,
    );
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
