/**
 * LANGUAGE PREFERENCE
 * =============================================================================
 * The toggle is a plain <form> posting to a server action, because the enrollment funnel
 * works with JavaScript disabled and a language switcher that needed JS would fail for
 * exactly the visitors most likely to need it.
 *
 * This harness therefore drives it THE SAME WAY A BROWSER WITH NO JAVASCRIPT WOULD: a
 * multipart POST carrying React's $ACTION_* bookkeeping. If these checks pass, the toggle
 * genuinely works without a bundle.
 *
 * SECURITY CHECKS MATTER MOST HERE
 *
 * The action takes two pieces of untrusted input and both have a real failure mode:
 *
 *   `lang`     — indexes the message catalogue. A crafted value must fall back to English,
 *                not render `undefined` across the page or throw.
 *   `returnTo` — IS AN OPEN REDIRECT IF UNCHECKED. A crafted form could aim it at another
 *                site and use the school's own domain as a phishing hop. Protocol-relative
 *                URLs (`//evil.example`) are the case a naive startsWith("/") check misses.
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

if (!BASE.startsWith("http://localhost") && !BASE.startsWith("http://127.0.0.1")) {
  console.error(`
  REFUSING TO RUN against ${BASE}. These harnesses write data and only run locally.
`);
  process.exit(1);
}

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
async function get(j, p, extraCookie) {
  const cookie = [hdr(j), extraCookie].filter(Boolean).join("; ");
  const r = await fetch(BASE + p, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
  store(j, r);
  return { status: r.status, location: r.headers.get("location"), body: await r.text() };
}

/**
 * Finds the language toggle's form.
 *
 * ⚠️  REACT EMITS TWO DIFFERENT SERVER-ACTION WIRE FORMATS, and the other harnesses only
 * know one of them:
 *
 *   BOUND / CLOSURE ACTION  (e.g. saveEnrollmentStep.bind(null, slug))
 *       $ACTION_REF_<n>      (empty)
 *       $ACTION_<n>:0        the action id, VERBATIM
 *       $ACTION_<n>:1        the bound arguments, VERBATIM
 *       $ACTION_KEY
 *
 *   DIRECT ACTION REFERENCE (e.g. action={setLanguageAction})
 *       $ACTION_ID_<hash>    single hidden input, EMPTY value
 *
 * The toggle passes the action directly, so it is the second shape. Looking for
 * $ACTION_REF_ here finds nothing and reads exactly like "the toggle did not render",
 * which is a misleading way to spend twenty minutes.
 */
function findToggleForm(html) {
  for (const f of html.match(/<form[\s\S]*?<\/form>/g) ?? []) {
    if (!f.includes('name="returnTo"')) continue;
    const actionId = f.match(/name="([$]ACTION_ID_[a-f0-9]+)"/);
    if (!actionId) continue;
    return { actionIdField: actionId[1], html: f };
  }
  return null;
}

async function submitToggle(jar, path, form, fields) {
  const fd = new FormData();
  // The action id field carries an empty value; its NAME is the identifier.
  fd.set(form.actionIdField, "");
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

console.log("\n=== LANGUAGE PREFERENCE (no-JS path) ===\n");

/* ---------- the toggle is present and offers every language ---------- */
const jar = newJar();
let form = null;
{
  const page = await get(jar, "/enroll");
  check("GET /enroll renders", page.status === 200, `status=${page.status}`);

  form = findToggleForm(page.body);
  check("Language toggle is a real form with a server action", Boolean(form));

  check("Offers English", page.body.includes("English"));
  check("Offers Spanish, named in Spanish", page.body.includes("Español"));
  check("Offers Lao, named in Lao", page.body.includes("ລາວ"));

  check(
    "Each option carries its own lang attribute (screen readers + Lao font)",
    /lang="es"/.test(page.body) && /lang="lo"/.test(page.body),
  );
  check(
    "Current language is disabled rather than hidden",
    /disabled=""|disabled/.test(form?.html ?? ""),
  );
  check(
    "returnTo is carried so the visitor comes back to this step",
    (form?.html ?? "").includes('value="/enroll"'),
  );
}

if (!form) {
  console.log("\n  No toggle form found; nothing further can be checked.\n");
  process.exit(1);
}

/* ---------- switching works with no JavaScript ---------- */
{
  const r = await submitToggle(jar, "/enroll", form, {
    lang: "es",
    returnTo: "/enroll",
  });
  check(
    "Submitting the form redirects (no JS involved)",
    r.status === 303 || r.status === 302 || r.status === 307,
    `status=${r.status} location=${r.location}`,
  );
  check("Cookie va_lang was set", jar.get("va_lang") === "es", jar.get("va_lang") ?? "unset");
  check(
    "Returns to the page it was submitted from",
    (r.location ?? "").endsWith("/enroll"),
    r.location ?? "none",
  );
}

/* ---------- the choice persists and is reflected ---------- */
{
  const page = await get(jar, "/enroll");
  check("Page still renders with the cookie set", page.status === 200);
  const spanishForm = findToggleForm(page.body);
  /**
   * With Spanish selected, the Spanish button becomes the disabled/current one. Asserting
   * on aria-current rather than on translated copy keeps this check meaningful regardless
   * of how much of the funnel has been translated yet.
   */
  check(
    "Spanish is now marked as the current language",
    /lang="es"[^>]*aria-current|aria-current="true"[^>]*lang="es"/.test(page.body) ||
      (spanishForm?.html ?? "").includes('aria-current="true"'),
  );
}

/* ---------- Lao gets the lang attribute that drives font + line breaking ---------- */
{
  const laoJar = newJar();
  const setPage = await get(laoJar, "/enroll");
  const laoForm = findToggleForm(setPage.body);
  await submitToggle(laoJar, "/enroll", laoForm, { lang: "lo", returnTo: "/enroll" });
  check("Switched to Lao", laoJar.get("va_lang") === "lo", laoJar.get("va_lang") ?? "unset");

  const page = await get(laoJar, "/enroll");
  check(
    'Funnel content is wrapped in lang="lo"',
    /<div[^>]+lang="lo"/.test(page.body),
    "drives the Noto Sans Lao font and Lao line breaking",
  );
}

/* ---------- SECURITY: a forged locale must fall back, not break ---------- */
{
  const page = await get(newJar(), "/enroll", "va_lang=xx-INVALID");
  check(
    "SECURITY: an unsupported locale cookie falls back to English",
    page.status === 200 && page.body.includes("Begin enrollment"),
    `status=${page.status}`,
  );
  check(
    "A forged locale renders no undefined keys",
    !page.body.includes("undefined") || !/>undefined</.test(page.body),
  );
}
{
  // A value crafted to look like a path traversal into the catalogue.
  const page = await get(newJar(), "/enroll", "va_lang=../../etc/passwd");
  check(
    "SECURITY: a traversal-shaped locale cookie is harmless",
    page.status === 200,
    `status=${page.status}`,
  );
}

/* ---------- SECURITY: returnTo must not become an open redirect ---------- */
{
  const cases = [
    ["//evil.example", "protocol-relative URL — the case startsWith('/') misses"],
    ["https://evil.example", "absolute URL"],
    ["/\\evil.example", "backslash form some clients normalise to //"],
    ["/admin", "internal but outside the funnel"],
    ["/enroll/../admin", "traversal — a browser normalises this to /admin"],
    ["/enroll/%2e%2e/admin", "percent-encoded traversal"],
    ["/enrollment-elsewhere", "prefix lookalike"],
  ];

  for (const [target, why] of cases) {
    const probe = newJar();
    const page = await get(probe, "/enroll");
    const f = findToggleForm(page.body);
    const r = await submitToggle(probe, "/enroll", f, { lang: "es", returnTo: target });
    const location = r.location ?? "";

    /**
     * ASSERT THE DESTINATION IS INSIDE THE FUNNEL, not merely "not another site".
     *
     * The weaker assertion is what let `/enroll/../admin` pass while escaping to /admin:
     * it never leaves the origin, so an off-site check says nothing about it. A redirect
     * target is safe here only if it is a same-origin path under /enroll with no traversal
     * left in it for the browser to resolve.
     */
    const safe =
      location.startsWith("/enroll") &&
      !location.startsWith("//") &&
      !location.includes("..") &&
      !/%2e/i.test(location) &&
      !location.includes("://");

    check(
      `SECURITY: returnTo "${target}" cannot leave the funnel`,
      safe,
      `${why} → ${location || "no location"}`,
    );
  }
}

/* ---------- the toggle appears where a family needs it ---------- */
{
  const page = await get(newJar(), "/enroll/submitted");
  // Without a draft cookie this redirects; either way it must not 500.
  check(
    "Confirmation page does not error",
    page.status === 200 || page.status === 307,
    `status=${page.status}`,
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
