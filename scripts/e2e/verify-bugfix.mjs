/**
 * Regression coverage for the two production bugs.
 *
 * BUG 1: Chrome/Edge address-autofill filled the text-input honeypot on the guardian step,
 *        so real families were rejected. Confirmed in production logs:
 *        [anti-abuse] honeypot filled on enroll-step
 *        The trap is now a CHECKBOX (autofill never ticks checkboxes) and the
 *        minimum-fill-time floor no longer applies to step saves.
 *
 * BUG 2: submit called discardDraft(), destroying the record the sibling flow copies
 *        contact details from, so "enroll another child" never pre-filled anything.
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

function findForm(html, marker) {
  for (const f of html.match(/<form[\s\S]*?<\/form>/g) ?? []) {
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
      html: f,
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

console.log("\n=== BUG FIX REGRESSION SUITE ===\n");

const jar = newJar();

// ---------- The honeypot must now be a checkbox, not a text input ----------
{
  const start = await get(jar, "/enroll");
  check("GET /enroll", start.status === 200);

  check(
    "Start page correctly has NO honeypot (that action runs no honeypot check)",
    !start.body.includes("va_form_confirm_x9"),
  );
  check(
    "BUG 1: old autofill-attracting name is gone",
    !start.body.includes("company_website"),
  );
  check(
    "BUG 1: old 'Company website' label is gone",
    !start.body.includes("Company website"),
  );

  // Begin enrollment
  const beginForm = findForm(start.body, null);
  const begun = await postForm(jar, "/enroll", beginForm, {});
  check("Begin creates a draft", begun.status === 303 && jar.has("va_enroll_draft"));
}

// ---------- BUG 1: a fast step save must now SUCCEED ----------
{
  const page = await get(jar, "/enroll/student");
  const hp = page.body.match(/<input[^>]*name="va_form_confirm_x9"[^>]*>/);
  check("Honeypot present on step pages under its new neutral name", Boolean(hp));
  if (hp) {
    check(
      "BUG 1: honeypot is type=checkbox (browser autofill cannot fill it)",
      /type="checkbox"/.test(hp[0]),
      hp[0].replace(/s+/g, " ").slice(0, 100),
    );
  }
  const form = findForm(page.body, 'name="studentLegalName"');
  // Deliberately NO sleep — this simulates a family accepting a browser autofill
  // dropdown and clicking Save immediately. Previously rejected as "too-fast".
  const r = await postForm(jar, "/enroll/student", form, {
    studentLegalName: "Regression Child One",
    dateOfBirth: "2014-04-11",
    gradeLevel: "Grade 6",
    requestedCohort: "middle",
    enrollmentStartDate: "2026-09-01",
  });
  check(
    "BUG 1: sub-2-second step save is ACCEPTED (autofill users no longer rejected)",
    r.status === 303,
    `status=${r.status}`,
  );
}

// ---------- BUG 1: the guardian step, the one that was failing ----------
{
  const page = await get(jar, "/enroll/guardian");
  const form = findForm(page.body, 'name="guardianEmail"');
  const r = await postForm(jar, "/enroll/guardian", form, {
    guardianName: "Regression Guardian",
    guardianAddress: "1 Regression Way, Storm Lake, IA 50588",
    guardianPhone: "712-555-0101",
    guardianEmail: `regression-parent+${RUN_TAG}@example.com`,
    emergencyContactName: "Emergency Contact",
    emergencyContactPhone: "712-555-0102",
  });
  check(
    "BUG 1: guardian step accepted immediately (the reported failure)",
    r.status === 303,
    `status=${r.status}`,
  );
}

// ---------- A ticked honeypot must STILL be rejected ----------
{
  const page = await get(jar, "/enroll/funding");
  const form = findForm(page.body, 'name="esaElection"');
  const r = await postForm(jar, "/enroll/funding", form, {
    esaElection: "intendsToApply",
    va_form_confirm_x9: "1", // a bot ticking everything
  });
  check(
    "SECURITY: a TICKED honeypot is still rejected",
    r.status === 200 && r.location === null,
    `status=${r.status}`,
  );
}

// ---------- Finish the wizard ----------
{
  let page = await get(jar, "/enroll/funding");
  let form = findForm(page.body, 'name="esaElection"');
  await postForm(jar, "/enroll/funding", form, { esaElection: "payingDirectly" });

  page = await get(jar, "/enroll/medical");
  form = findForm(page.body, 'name="immunizationStatus"');
  await postForm(jar, "/enroll/medical", form, {
    conditionsAndAllergies: "Regression allergy detail",
    medications: "",
    doctorName: "Dr Regression",
    doctorPhone: "712-555-0103",
    immunizationStatus: "recordsOnFile",
  });

  const ackKeys = [
    "masteryProgression", "taekwondoRequired", "graduationEarned",
    "attendanceCommitment", "behavioralFramework", "monthlyContribution",
    "activityConsent", "recordsConfidentiality",
  ];
  page = await get(jar, "/enroll/acknowledgments");
  form = findForm(page.body, 'name="masteryProgression"');
  await postForm(jar, "/enroll/acknowledgments", form,
    Object.fromEntries(ackKeys.map((k) => [k, "true"])));

  page = await get(jar, "/enroll/media");
  form = findForm(page.body, 'name="mediaRelease"');
  const r = await postForm(jar, "/enroll/media", form, { mediaRelease: "consent" });
  check("Wizard completed through to review", r.status === 303);
}

// ---------- The submit floor must STILL apply ----------
{
  const page = await get(jar, "/enroll/sign");
  const form = findForm(page.body, 'name="typedName"');
  // No sleep — the minimum fill time is still enforced on the FINAL submit.
  const tooFast = await postForm(jar, "/enroll/sign", form, {
    typedName: "Too Fast Bot",
    intentAffirmed: "true",
  });
  check(
    "SECURITY: sub-2-second FINAL SUBMIT is still rejected",
    tooFast.status === 200 && tooFast.location === null,
    `status=${tooFast.status}`,
  );
}

// ---------- Legitimate submit ----------
{
  const page = await get(jar, "/enroll/sign");
  const form = findForm(page.body, 'name="typedName"');
  await sleep(2400);
  const r = await postForm(jar, "/enroll/sign", form, {
    typedName: "Regression Guardian",
    intentAffirmed: "true",
  });
  check("Valid submit succeeds", r.status === 303, `status=${r.status}`);
  check(
    "BUG 2: draft cookie RETAINED after submit (needed for sibling carry-over)",
    jar.has("va_enroll_draft"),
  );
}

// ---------- A submitted draft must not be resumable ----------
{
  const r = await get(jar, "/enroll/student");
  check(
    "SECURITY: a submitted draft cannot be resumed",
    r.status === 307 && (r.location ?? "").endsWith("/enroll"),
    `status=${r.status} -> ${r.location}`,
  );
}

// ---------- BUG 2: the sibling flow ----------
{
  const done = await get(jar, "/enroll/submitted");
  check("Confirmation page renders", done.status === 200);
  check(
    "PRIVACY: confirmation page has no student name",
    !done.body.includes("Regression Child One"),
  );

  const siblingForm = findForm(done.body, null);
  check("Sibling button present", Boolean(siblingForm));

  if (siblingForm) {
    const r = await postForm(jar, "/enroll/submitted", siblingForm, {});
    check("Sibling flow starts a new agreement", r.status === 303, `status=${r.status}`);

    // THE ACTUAL BUG: are the contact details pre-filled?
    const guardian = await get(jar, "/enroll/guardian");
    check("Sibling guardian step loads", guardian.status === 200);

    const prefilled = {
      name: guardian.body.includes('value="Regression Guardian"'),
      address: guardian.body.includes("1 Regression Way"),
      phone: guardian.body.includes("712-555-0101"),
      email: guardian.body.includes(`regression-parent+${RUN_TAG}@example.com`),
      emergencyName: guardian.body.includes('value="Emergency Contact"'),
    };
    check(
      "BUG 2 FIXED: guardian name carried over",
      prefilled.name,
      JSON.stringify(prefilled),
    );
    check("BUG 2 FIXED: address carried over", prefilled.address);
    check("BUG 2 FIXED: phone carried over", prefilled.phone);
    check("BUG 2 FIXED: email carried over", prefilled.email);

    const medical = await get(jar, "/enroll/medical");
    check(
      "BUG 2 FIXED: doctor details carried over",
      medical.body.includes("Dr Regression"),
    );

    // And the things that must NOT carry over.
    check(
      "PRIVACY: the first child's medical history did NOT carry over",
      !medical.body.includes("Regression allergy detail"),
    );
    const student = await get(jar, "/enroll/student");
    check(
      "CORRECTNESS: the first child's name did NOT carry over",
      !student.body.includes("Regression Child One"),
    );
    const media = await get(jar, "/enroll/media");
    check(
      "CONSENT: media release is not pre-chosen for the sibling",
      !/name="mediaRelease"[^>]*value="consent"[^>]*checked/.test(media.body),
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
