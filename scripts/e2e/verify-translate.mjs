/**
 * THE LANGUAGE LENS — endpoint guards, cache, and scope
 * =============================================================================
 * /api/translate is UNAUTHENTICATED and calls a PAID API. That combination is the entire
 * risk surface, so most of this harness is about what the endpoint REFUSES.
 *
 * The single most important assertion here is the agreement guard. The enrollment agreement
 * must never be machine-translated — its English wording is what `agreementHash()` covers
 * and what every signature attests to. The UI half of that rule (the lens refusing to
 * activate under /enroll) is a UI decision and can be routed around by anyone with curl,
 * so the endpoint enforces it on content independently. Both halves are asserted.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS DELIBERATELY DOES NOT TEST, AND WHY
 *
 * The numeric rate limits (120/hr per IP, 2000/day globally) are NOT exercised. Tripping
 * the per-IP limiter takes 120 requests and tripping the global cap takes 2000, and every
 * one that misses the cache spends real money on a real model call. Asserting them would
 * cost more than it proves. What IS asserted is that a request survives the whole guard
 * chain and reaches the model, which means the limiter is wired into a live path rather
 * than dead.
 *
 * Exactly ONE real model call is made per run (the first translation); the second asserts
 * it came back from cache instead.
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
function skip(name, why) {
  results.push({ name, pass: true, detail: `SKIPPED: ${why}`, skipped: true });
  console.log(`  SKIP  ${name} — ${why}`);
}

async function post(body, { origin = BASE, raw = null } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (origin) headers.Origin = origin;
  const r = await fetch(`${BASE}/api/translate`, {
    method: "POST",
    headers,
    body: raw ?? JSON.stringify(body),
  });
  let json = null;
  try {
    json = await r.json();
  } catch {
    /* non-JSON body */
  }
  return { status: r.status, json };
}

console.log("\n=== LANGUAGE LENS (/api/translate) ===\n");

/* ---------------- method + origin ---------------- */
{
  const r = await fetch(`${BASE}/api/translate`, { method: "GET" });
  check("GET is refused", r.status === 405, `status=${r.status}`);
}
{
  // No Origin header at all — not a browser same-origin POST.
  const r = await post({ text: "hello there friend", locale: "es" }, { origin: null });
  check(
    "SECURITY: request with no Origin is refused",
    r.status === 403,
    `status=${r.status}`,
  );
}
{
  const r = await post(
    { text: "hello there friend", locale: "es" },
    { origin: "https://evil.example" },
  );
  check(
    "SECURITY: cross-origin request is refused",
    r.status === 403,
    `status=${r.status}`,
  );
}

/* ---------------- input validation ---------------- */
{
  const r = await post(null, { raw: "not json at all" });
  check("Malformed JSON is refused", r.status === 400, `status=${r.status}`);
}
{
  const r = await post({ locale: "es" });
  check("Missing text is refused", r.status === 400, `status=${r.status}`);
}
{
  const r = await post({ text: "a valid enough sentence here", locale: "xx" });
  check("Unsupported locale is refused", r.status === 400, `status=${r.status}`);
}
{
  const r = await post({ text: "x".repeat(5000), locale: "es" });
  check(
    "SECURITY: over-length text is refused (bounds per-call cost)",
    r.status === 400,
    `status=${r.status}`,
  );
}
{
  const r = await post({ text: "The school day begins at eight.", locale: "en" });
  check(
    "English is a no-op, not an error",
    r.status === 200 && r.json?.translation === null,
    `reason=${r.json?.reason}`,
  );
}

/* ---------------- THE AGREEMENT GUARD ---------------- */
{
  /**
   * Verbatim from lib/enrollment/agreement-text.ts. If the wording is ever edited, this
   * string must be updated with it — and `npm run check:agreement` will have failed first,
   * which is the intended order of discovery.
   */
  const ACK =
    "We understand that Taekwondo is a core and required component of enrollment, not elective.";

  const r = await post({ text: ACK, locale: "es" });
  check(
    "SECURITY: enrollment-agreement text is refused outright",
    r.status === 422 && r.json?.translation === null,
    `status=${r.status} reason=${r.json?.reason}`,
  );

  // And with surrounding prose, so exact-match alone cannot be the whole guard.
  const wrapped = await post({
    text: `Please note the following. ${ACK} Thank you for reading.`,
    locale: "es",
  });
  check(
    "SECURITY: agreement text embedded in other prose is also refused",
    wrapped.status === 422,
    `status=${wrapped.status}`,
  );

  const preamble = await post({
    text: "By signing below, the parent/guardian confirms they have read The VA School Student & Family Handbook and agrees to the following:",
    locale: "lo",
  });
  check(
    "SECURITY: the agreement preamble is refused too",
    preamble.status === 422,
    `status=${preamble.status}`,
  );
}

/* ---------------- a real translation, then the cache ---------------- */
{
  // Unique per run so the first call genuinely misses the cache.
  const RUN = Date.now().toString(36);
  const SOURCE = `Our school day runs Monday through Thursday, and every student trains in Taekwondo. Reference ${RUN}.`;

  const first = await post({ text: SOURCE, locale: "es" });

  if (first.status === 200 && typeof first.json?.translation === "string") {
    check("A real translation is returned", true, `cached=${first.json.cached}`);
    check(
      "First call was NOT served from cache",
      first.json.cached === false,
      `cached=${first.json.cached}`,
    );
    check(
      "Translation is not just the English echoed back",
      first.json.translation.trim() !== SOURCE.trim(),
    );
    check(
      "Translation carries no JSON wrapper or preamble",
      !first.json.translation.trim().startsWith("{") &&
        !/^(here is|here's|translation:)/i.test(first.json.translation.trim()),
      first.json.translation.slice(0, 60),
    );

    /**
     * THE CACHE ASSERTION — the one that makes this feature affordable. The identical
     * request must come back from storage, not from a second paid model call.
     */
    const second = await post({ text: SOURCE, locale: "es" });
    check(
      "Identical request is served FROM CACHE (no second model call)",
      second.status === 200 && second.json?.cached === true,
      `cached=${second.json?.cached}`,
    );
    check(
      "Cached translation matches the first",
      second.json?.translation === first.json.translation,
    );

    // Whitespace differences must not miss the cache — that would silently restore
    // per-visitor cost.
    const spaced = await post({
      text: `  ${SOURCE.replace(/ /g, "  ")}  `,
      locale: "es",
    });
    check(
      "Whitespace-only differences still hit the cache",
      spaced.json?.cached === true,
      `cached=${spaced.json?.cached}`,
    );
  } else if (first.json?.reason === "not-configured") {
    skip("A real translation is returned", "ANTHROPIC_API_KEY is not set");
    skip("Identical request is served FROM CACHE", "no translation to cache");
  } else {
    check(
      "A real translation is returned",
      false,
      `status=${first.status} reason=${first.json?.reason}`,
    );
  }
}

/* ---------------- scope: the lens in the rendered pages ---------------- */
{
  const about = await fetch(`${BASE}/about`).then((r) => r.text());
  check(
    "The lens control is in the header on a marketing page",
    about.includes('title="Translate"') && about.includes("文A"),
    "moved out of the floating corner button, which was hard to find",
  );
  /**
   * The disclosure is CONDITIONALLY rendered — once in the chooser (before a reader picks
   * a language) and once on every revealed translation (as they read it). Neither is in
   * the initial HTML, so asserting on the page body would be asserting the wrong thing.
   * Check the client bundle actually ships both strings instead.
   */
  const scriptUrls = [...about.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map(
    (m) => m[1],
  );
  let bundles = "";
  for (const url of scriptUrls.slice(0, 40)) {
    bundles += await fetch(`${BASE}${url}`)
      .then((r) => r.text())
      .catch(() => "");
  }
  check(
    "Disclosure ships to the reader: chooser warning",
    bundles.includes("Translations are automatic") &&
      bundles.includes("Las traducciones son automáticas"),
    "and in Spanish too — the chooser speaks the reader's language",
  );
  check(
    "Disclosure ships to the reader: per-translation notice",
    bundles.includes("Automatic translation"),
    "shown on every revealed paragraph, next to the English",
  );

  const enroll = await fetch(`${BASE}/enroll`).then((r) => r.text());
  /**
   * The component is mounted from the marketing layout, which the funnel nests inside, so
   * it is present in the bundle — but it must render NOTHING under /enroll. Assert on the
   * rendered control, not on the absence of the script.
   */
  check(
    "SECURITY: the lens does not render in the enrollment funnel",
    !enroll.includes('title="Translate"') && !enroll.includes("Read this page in"),
    "the funnel has reviewed translations; the agreement is never machine-translated",
  );
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
