/**
 * SCHOOL EMAIL RULE — UNIT CHECK
 * =============================================================================
 *   npx tsx --conditions=react-server scripts/check-school-email.ts
 *
 * The school stated the rule as: first name + day of birth + first letter of last
 * name + two-digit birth year, at vaschool.org. Their worked example is
 * Lily Von Der Becke, born 16 March 2013 -> lily16v13@vaschool.org.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE END-TO-END HARNESS
 *
 * The e2e harness proves the WIRING (promotion generates an address, stores it, and
 * marks it pending). It cannot cleanly prove the RULE, because `students.schoolEmail`
 * carries a partial unique index: a second run with the same name and birthday
 * correctly collides and resolves to `lily16v13.2@`, so asserting the canonical
 * address there fails for a reason that has nothing to do with the rule.
 *
 * This needs no database, so leftover rows cannot perturb it, and it pins the edge
 * cases a single worked example leaves open: accents, punctuation, middle names, zero
 * padding, and names with no surname at all.
 *
 * No test runner is configured for this project, so this is a plain script that exits
 * non-zero on failure — runnable by hand or from CI without adding a dependency.
 */

import {
  buildSchoolEmail,
  buildSchoolEmailLocalPart,
  resolveCollision,
  isPlausibleSchoolEmail,
} from "../lib/school-email";

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n          ${detail}` : ""}`);
  if (ok) pass++;
  else fail++;
}

const at = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** [legal name, ISO birth date, expected address or null, what the case pins down] */
const cases: Array<[string, string, string | null, string]> = [
  [
    "Lily Von Der Becke",
    "2013-03-16",
    "lily16v13@vaschool.org",
    "the school's worked example: the initial is V, from the FIRST surname token",
  ],
  [
    "José O'Brien-Smith",
    "2015-01-05",
    "jose05o15@vaschool.org",
    "accent folded to plain ASCII, apostrophe and hyphen dropped, day zero-padded to 05",
  ],
  [
    "Mary Jane Watson",
    "2009-12-31",
    "mary31j09@vaschool.org",
    "CONSEQUENCE OF THE RULE: everything after the given name is treated as the surname, " +
      "so a MIDDLE NAME supplies the initial — J from Jane, not W from Watson",
  ],
  [
    "Ann Lee",
    "2020-07-04",
    "ann04l20@vaschool.org",
    "year below 2010 still yields two digits (20), and the 4th pads to 04",
  ],
  [
    "Prince",
    "2011-02-02",
    null,
    "a mononym yields no surname initial, so no address — the caller must handle null " +
      "rather than invent a letter",
  ],
];

console.log("\n=== SCHOOL EMAIL RULE ===\n");

for (const [legalName, dob, expected, why] of cases) {
  const got = buildSchoolEmail({ legalName, dateOfBirth: at(dob) });
  const ok = got === expected;
  check(
    `${legalName} / ${dob} -> ${got ?? "null"}`,
    ok,
    ok ? why : `EXPECTED ${expected ?? "null"} — ${why}`,
  );
}

// An unparseable date must fail closed rather than produce "NaN" inside an address.
check(
  "an invalid date of birth yields null, not a malformed address",
  buildSchoolEmail({ legalName: "Lily Von Der Becke", dateOfBirth: new Date("nonsense") }) ===
    null,
);

// Local part on its own, for callers that append the domain themselves.
check(
  "local part alone is lily16v13",
  buildSchoolEmailLocalPart({
    legalName: "Lily Von Der Becke",
    dateOfBirth: at("2013-03-16"),
  }) === "lily16v13",
);

/**
 * Collision handling. The format encodes only a given name, a day, one surname letter
 * and a year — it is NOT injective, and the month is absent entirely. Two genuinely
 * different students collide whenever those four agree, so promotion must never mint a
 * duplicate against the unique index.
 */
{
  const none = resolveCollision("lily16v13", []);
  check(
    "no collision returns the base unchanged and reports collided=false",
    none.localPart === "lily16v13" && none.collided === false,
  );

  const first = resolveCollision("lily16v13", ["lily16v13@vaschool.org"]);
  check(
    "first collision appends .2 and reports collided=true",
    first.localPart === "lily16v13.2" && first.collided === true,
    "note the input is a full address — resolveCollision strips the domain itself",
  );

  const second = resolveCollision("lily16v13", ["lily16v13", "lily16v13.2"]);
  check(
    "second collision appends .3",
    second.localPart === "lily16v13.3" && second.collided === true,
  );

  const cased = resolveCollision("lily16v13", ["LILY16V13"]);
  check(
    "collision matching is case-insensitive",
    cased.localPart === "lily16v13.2",
    "Office 365 local parts are case-insensitive, so a differing case is still a clash",
  );
}

/**
 * Shape validation for an address an administrator typed by hand. Deliberately
 * permissive — the school may need to deviate from the pattern for a real reason — so
 * this asserts only that it rejects what Office 365 certainly would.
 */
check(
  "accepts a generated address",
  isPlausibleSchoolEmail("lily16v13@vaschool.org"),
);
check(
  "accepts a collision variant containing a dot",
  isPlausibleSchoolEmail("lily16v13.2@vaschool.org"),
);
check("rejects a value with no @", !isPlausibleSchoolEmail("lily16v13"));
check("rejects a leading dot in the local part", !isPlausibleSchoolEmail(".lily@vaschool.org"));
check("rejects a domain with no dot", !isPlausibleSchoolEmail("lily@vaschool"));
check(
  "does NOT restrict the domain — an outside address passes shape validation",
  isPlausibleSchoolEmail("lily@gmail.com"),
  "intentional: the check is shape-only, so the admin UI must not rely on it to keep " +
    "mailboxes inside vaschool.org",
);

console.log(`\n  ${pass}/${pass + fail} passed\n`);
process.exit(fail ? 1 : 0);
