/**
 * Verifies the EXECUTED ENROLLMENT AGREEMENT page after it moved out of /portal and
 * into /admin/students/[id]/agreement.
 *
 * What matters here is that the school did not lose a capability in the move: the
 * printable document must still render, still carry its evidence envelope, and still be
 * unreachable without a session.
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
    if (!id) continue;
    return {
      n,
      idField: id[1].replace(/&quot;/g, '"'),
      bound: st ? st[1].replace(/&quot;/g, '"') : '[{"ok":false}]',
      key: key ? key[1] : null,
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

console.log("\n=== EXECUTED AGREEMENT (moved into /admin) ===\n");

/* ---------- Admin session ---------- */
const admin = newJar();
{
  const lp = await get(admin, "/login");
  const r = await postForm(admin, "/login", findForm(lp.body, 'name="email"'), {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  check("Admin login", admin.has("va_session"), `status=${r.status}`);
  if (!admin.has("va_session")) process.exit(1);
}

/* ---------- Find a promoted student (one with an application behind it) ---------- */
const roster = await get(admin, "/admin/students");
const ids = [...new Set([...roster.body.matchAll(/\/admin\/students\/([a-f0-9]{24})/g)].map((m) => m[1]))];
check("Roster lists students", ids.length > 0, `${ids.length} found`);

let found = null;
for (const id of ids) {
  const r = await get(admin, `/admin/students/${id}/agreement`);
  if (r.status === 200) {
    found = { id, body: r.body };
    break;
  }
}
check(
  "Agreement renders for a promoted student",
  Boolean(found),
  found ? found.id : "no student returned 200",
);

if (found) {
  const b = found.body;
  const has = (s) => b.includes(s);

  check("Letterhead carries the legal entity", has("The Von Der Becke Academy Corp"));
  check("Titled as the Family Enrollment Agreement", has("Family Enrollment Agreement"));
  check("Shows the executed date and consent version", has("Consent version"));
  check("Reproduces the numbered acknowledgments", has("Accepted"));
  check("Includes the guardian signature block", has("Parent / guardian"));
  check("Includes the Head of School block", has("Head of School"));
  check("Carries the E-SIGN / Iowa UETA attestation", has("Iowa Code ch. 554D"));
  check("Carries the agreement fingerprint", has("Agreement fingerprint"));
  check("Has a print control", has("Print") || has("print"));
  check(
    "Staff guidance present but marked no-print",
    has("This is the family") && has("no-print"),
  );
  check("Back link returns to the student file", has(`/admin/students/${found.id}`));

  /* ---------- Authorization ---------- */
  const anon = newJar();
  const a = await get(anon, `/admin/students/${found.id}/agreement`);
  check(
    "SECURITY: anonymous access is refused",
    a.status === 307 || a.status === 404,
    `status=${a.status}`,
  );

  const parent = newJar();
  const pl = await get(parent, "/login");
  await postForm(parent, "/login", findForm(pl.body, 'name="email"'), {
    email: "scope-test-parent@example.com",
    password: "ScopeTestPassword123!",
  });
  if (parent.has("va_session")) {
    const pr = await get(parent, `/admin/students/${found.id}/agreement`);
    check(
      "SECURITY: an unlinked parent cannot read the agreement",
      pr.status === 404 || pr.status === 307,
      `status=${pr.status}`,
    );
  } else {
    check("SECURITY: an unlinked parent cannot read the agreement", false, "parent login failed");
  }

  const bad = await get(admin, `/admin/students/${"0".repeat(24)}/agreement`);
  check("Nonexistent student yields 404", bad.status === 404, `status=${bad.status}`);
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
