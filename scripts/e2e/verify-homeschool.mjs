/**
 * End-to-end verification of the Homeschool at Home tier's PUBLIC COPY and its link to the
 * app's self-service sign-up.
 *
 * HISTORY: until 2026-11-09 this harness drove an interest form on /homeschool (honeypot,
 * stored inquiry, a monthly estimate at $20/child). Sign-up and card billing moved to the
 * School Day app (app.vaschool.org/enroll) — see docs/remove-signup-from-vaschool-site.md —
 * so the form was deleted and this harness now asserts the NEW contract:
 *
 *   1. The new price copy ($19.95 first child, $10 each additional) — and the old
 *      "$20 per child" is gone everywhere the tier is mentioned.
 *   2. /homeschool links the app's SIGN-UP url, and never its LOGIN url. A visitor here has
 *      no account; a login wall is the worst answer to "I want to sign up".
 *   3. No Taekwondo / dojo promise for this tier.
 *   4. /homeschool carries no form of its own (only the header's language toggle, which is
 *      identifiable by its `returnTo` field) and no signed form timestamp.
 *
 * READ-ONLY: it only issues GETs. The localhost guard is kept anyway, for consistency with
 * every other harness and so nobody copies this file into a writing harness without it.
 *
 * NOT asserted here: that /homeschool is STATIC. `next dev` renders every page per request,
 * so that is checked from the `npm run build` route table instead, where /homeschool must
 * appear as ○ (static), not ƒ (dynamic).
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

if (!BASE.startsWith("http://localhost") && !BASE.startsWith("http://127.0.0.1")) {
  console.error(`
  REFUSING TO RUN against ${BASE}. These harnesses only run locally.
`);
  process.exit(1);
}

const SIGNUP_URL = "https://app.vaschool.org/enroll";
const LOGIN_URL = "app.vaschool.org/login";

async function get(path) {
  const res = await fetch(BASE + path, { redirect: "manual" });
  return { status: res.status, body: await res.text() };
}

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

/** Counts occurrences rather than testing presence — see Trap 9 in docs/verification.md. */
function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

/**
 * Returns every <form> on the page that is NOT the language toggle. The toggle lives in the
 * site header on every page and is recognisable by its `returnTo` field.
 */
function nonToggleForms(html) {
  return (html.match(/<form[\s\S]*?<\/form>/g) ?? []).filter(
    (f) => !f.includes('name="returnTo"'),
  );
}

console.log("\n=== HOMESCHOOL AT HOME — copy, sign-up link, and no form ===\n");

/* ---------------- 1. The page renders and states the NEW price ------------ */

const page = await get("/homeschool");
check("GET /homeschool renders", page.status === 200, `status=${page.status}`);
check("Page names the tier", page.body.includes("Homeschool at Home"));
check("Page states the first-child price ($19.95)", page.body.includes("$19.95"));
check("Page states the additional-child price ($10)", page.body.includes("$10"));
// (?![\d.]) so the $200 full-enrollment figure in the comparison table does not match.
check("Page no longer states the old $20 price", !/\$20(?![\d.])/.test(page.body));

/* ---------------- 2. THE ACCOUNT BOUNDARY: sign-up yes, login no ---------- */

/**
 * SCOPED TO <main>, NOT THE WHOLE DOCUMENT. The site header and footer carry a sitewide
 * "Already enrolled → app login" link for audience 2 (see `dailyApp` in lib/site.ts), so a
 * whole-page search always finds the login URL. That made the original whole-page
 * assertion fail regardless of this page's content. The rule is about what THIS PAGE
 * tells a not-yet-signed-up family to do, which is the content inside <main>.
 *
 * <main> is matched as a whole element; React's RSC payload (a <script> after </main>)
 * repeats the header/footer hrefs as JSON and is deliberately outside the match.
 */
const mainMatch = page.body.match(/<main[\s>][\s\S]*?<\/main>/);
const main = mainMatch ? mainMatch[0] : "";
check("Page has a <main> element to inspect", main.length > 0);

const signupLinks = count(main, `href="${SIGNUP_URL}"`);
check(
  "BOUNDARY: page content links the app's sign-up (app.vaschool.org/enroll)",
  signupLinks >= 1,
  `found ${signupLinks}`,
);
check(
  "BOUNDARY: page content does NOT link the app login (visitor has no account yet)",
  !main.includes(LOGIN_URL),
);
check("Page still describes the School Day app", page.body.includes("School Day app"));

/* ---------------- 3. No Taekwondo promise for this tier ------------------- */

check("No dojo promise on /homeschool", !/dojo/i.test(page.body));
check(
  "No 'Taekwondo included / at no cost' promise",
  !/Taekwondo at (the dojo|no (additional|extra) cost)/i.test(page.body),
);
check(
  "HONESTY: ESA is stated as NOT applying to this tier",
  /ESA funding does not apply to this tier/i.test(page.body),
);

/* ---------------- 4. No form of its own, no signed timestamp -------------- */

const forms = nonToggleForms(page.body);
check("No form on /homeschool besides the language toggle", forms.length === 0, `found ${forms.length}`);
check("No signed form timestamp on the page", !page.body.includes('name="form_issued"'));
check("Old #interest anchor is gone", !page.body.includes('id="interest"'));

/* ---------------- 5. The other pages that mention the tier ---------------- */

/**
 * The tier is cross-sold from the home page, /tuition and /admissions. Each one renders
 * from `homeschoolAtHome` in lib/site.ts, but each also had hand-written Taekwondo copy,
 * so each is checked rather than trusting the shared constant.
 */
for (const path of ["/", "/tuition", "/admissions"]) {
  const p = await get(path);
  check(`GET ${path} renders`, p.status === 200, `status=${p.status}`);
  check(`${path}: states the new $19.95 price`, p.body.includes("$19.95"));
  check(`${path}: no "$20 per child" copy`, !/\$20 per child/i.test(p.body));
  check(`${path}: no dojo promise for this tier`, !/dojo if you are close enough/i.test(p.body));
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
