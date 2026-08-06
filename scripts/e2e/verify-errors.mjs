/**
 * ERROR REPORTING — PII SCRUBBING AND CORRELATION
 * =============================================================================
 * Unlike the other harnesses this one needs no server: it exercises lib/errors.ts directly.
 *
 * The assertions that matter are the SCRUBBING ones. This is a K-12 school, error messages
 * routinely quote the input that caused them, and that input is a child's name, a date of
 * birth, or a parent's email address. A log line is forever, gets shipped to whatever
 * aggregator comes later, and shows up in screenshares. Every check below is really the same
 * check: nothing identifying reaches the log.
 */

import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

console.log("\n=== ERROR REPORTING (scrubbing, classification, references) ===\n");

/**
 * Run in a child process via tsx: lib/errors.ts is TypeScript and reportError writes to
 * stderr, which is exactly what we want to capture and assert on.
 */
const probe = `
import { scrub, reportError, messageFor, isNextControlFlow } from "../lib/errors";

const out = {};
out.email = scrub("Invalid email: parent@example.com rejected");
out.uri = scrub("failed to connect mongodb+srv://user:hunter2@cluster.mongodb.net/db");
out.phone = scrub("bad phone 712-555-0199 supplied");
out.dob = scrub("date of birth 2011-04-17 is out of range");
out.secret = scrub("Authorization: Bearer sk-ant-abcdef1234567890");
out.password = scrub("password=hunter2");
out.harmless = scrub("Cannot read properties of undefined (reading 'grade')");

const net = new Error("connection timed out");
net.name = "MongoServerSelectionError";
const netReport = reportError(net, { where: "test:net" });
out.netClass = netReport.class;
out.unavailableMessage = messageFor(netReport);

const auth = new Error("nope");
auth.name = "AuthorizationError";
out.authClass = reportError(auth, { where: "test:auth" }).class;

const plain = reportError(new Error("boom"), { where: "test:plain" });
out.plainClass = plain.class;
out.reference = plain.reference;
out.plainMessage = messageFor(plain);

const withDigest = Object.assign(new Error("rendered"), { digest: "1234567890" });
out.digestReference = reportError(withDigest, { where: "test:digest" }).reference;

const redirect = Object.assign(new Error("redirect"), { digest: "NEXT_REDIRECT;push;/x;307;" });
out.isControlFlow = isNextControlFlow(redirect);
out.notFoundIsControlFlow = isNextControlFlow(Object.assign(new Error("nf"), { digest: "NEXT_NOT_FOUND" }));
out.realErrorIsNotControlFlow = isNextControlFlow(new Error("real"));

// The PII must not survive into the emitted log line either, not just into scrub()'s return.
const leaky = new Error("could not save parent@example.com born 2011-04-17");
reportError(leaky, { where: "test:leak", detail: { note: "contact 712-555-0199" } });

console.log("__RESULT__" + JSON.stringify(out));
`;

writeFileSync("scripts/_tmp-error-probe.ts", probe);

/**
 * spawnSync, so stdout AND stderr come back from ONE run. reportError writes to stderr, and
 * the assertions below check both the returned values and what was actually emitted — the
 * distinction that matters, because scrubbing applied only on the return path would leak.
 */
const run = spawnSync(
  "npx",
  ["tsx", "--conditions=react-server", "scripts/_tmp-error-probe.ts"],
  { encoding: "utf8", shell: true },
);
unlinkSync("scripts/_tmp-error-probe.ts");

const stdout = run.stdout ?? "";
const stderr = run.stderr ?? "";
if (!stdout.includes("__RESULT__")) {
  console.error("probe failed to run:", stderr || run.error?.message);
  process.exit(1);
}

const out = JSON.parse(stdout.split("__RESULT__")[1].trim());

/* ---------------- scrubbing ---------------- */
check("PII: an email address is redacted", out.email === "Invalid email: [email] rejected", out.email);
check(
  "SECURITY: a mongodb URI (with credentials) is redacted",
  !out.uri.includes("hunter2") && out.uri.includes("[mongodb-uri]"),
  out.uri,
);
check("PII: a phone number is redacted", out.phone.includes("[phone]"), out.phone);
check("PII: a date of birth is redacted", out.dob.includes("[date]"), out.dob);
check("SECURITY: a bearer token / API key is redacted", !out.secret.includes("abcdef1234567890"), out.secret);
check("SECURITY: a password assignment is redacted", !out.password.includes("hunter2"), out.password);
check(
  "A message with nothing identifying is left intact",
  out.harmless === "Cannot read properties of undefined (reading 'grade')",
  "over-redaction would make logs useless",
);

/* ---------------- the emitted line, not just the helper ---------------- */
check(
  "PII: the EMITTED log line carries no email address",
  !stderr.includes("parent@example.com"),
  "scrub() is applied on the way out, not only when called directly",
);
check("PII: the emitted log line carries no date of birth", !stderr.includes("2011-04-17"));
check("PII: detail values are scrubbed too", !stderr.includes("712-555-0199"));
check(
  "Each emitted line is a single parseable JSON object",
  stderr
    .split("\n")
    .filter((l) => l.trim().startsWith("{"))
    .every((l) => {
      try {
        JSON.parse(l);
        return true;
      } catch {
        return false;
      }
    }),
  "one line per failure, so interleaved requests stay readable",
);

/* ---------------- classification ---------------- */
check("A Mongo connection failure classifies as 'unavailable'", out.netClass === "unavailable", out.netClass);
check("An AuthorizationError classifies as 'authorization'", out.authClass === "authorization", out.authClass);
check("An ordinary defect classifies as 'unknown'", out.plainClass === "unknown", out.plainClass);
check(
  "'unavailable' gets a try-again message, not a 'this is broken' one",
  out.unavailableMessage.includes("try again in a moment") &&
    !out.unavailableMessage.includes("Something went wrong on our end"),
  "a five-second network blip must not read to a family as a broken website",
);

/* ---------------- references ---------------- */
check(
  "A reference is generated and is readable aloud",
  /^[23456789ACDEFGHJKMNPQRTVWXYZ]{4}-[23456789ACDEFGHJKMNPQRTVWXYZ]{4}$/.test(out.reference),
  out.reference,
);
check(
  "The reference appears in the message shown to the visitor",
  out.plainMessage.includes(out.reference),
  "otherwise there is nothing to quote on the phone",
);
check(
  "The reference is in the emitted log line",
  stderr.includes('"reference"'),
  "screen and log must agree",
);
check(
  "Next's own digest is reused rather than competing with it",
  out.digestReference === "1234567890",
  out.digestReference,
);

/* ---------------- control flow must never be reported ---------------- */
check("redirect() is recognised as control flow, not an error", out.isControlFlow === true);
check("notFound() is recognised as control flow, not an error", out.notFoundIsControlFlow === true);
check("A real error is NOT mistaken for control flow", out.realErrorIsNotControlFlow === false);

console.log("\n=== SUMMARY ===");
const failed = results.filter((r) => !r.pass);
console.log(`  ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log("\n  FAILURES:");
  for (const f of failed) console.log(`    - ${f.name} ${f.detail}`);
  process.exit(1);
}
console.log("  All checks passed.\n");
