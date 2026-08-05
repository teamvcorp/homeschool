/**
 * SCHOOL EMAIL ADDRESSES
 * =============================================================================
 * The school issues each enrolled student an address on vaschool.org, built from their
 * name and date of birth.
 *
 * FORMAT: {firstName}{DD}{lastInitial}{YY}@vaschool.org
 *
 *   first name  ·  2-digit day of birth  ·  first letter of surname  ·  2-digit birth year
 *
 * Worked example (the school's own): Lily Von Der Becke, born the 16th, 2013
 *   → lily16v13@vaschool.org
 *
 * This module is deliberately free of server-only imports and database access so the
 * generation rule can be unit-tested and also previewed in the admin UI before saving.
 * Uniqueness is enforced separately, at the point of writing — see `resolveCollision`.
 */

export const SCHOOL_EMAIL_DOMAIN = "vaschool.org";

/**
 * Strips a name down to what is safe in the local part of an address.
 *
 * Handles the cases real names actually contain:
 *  - accents and diacritics → their ASCII base (José → jose), so the address is typeable
 *    on any keyboard and matches what Office 365 will accept
 *  - apostrophes and hyphens → removed (O'Brien → obrien, Smith-Jones → smithjones)
 *  - spaces and particles → removed (Von Der Becke → vonderbecke)
 *  - anything else non-alphanumeric → removed
 */
export function normalizeNamePart(value: string): string {
  return (
    value
      .normalize("NFD")
      // Strip the combining diacritical marks NFD leaves behind. Escaped explicitly
      // rather than written literally, so the range survives any file re-encoding.
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      // Anything not a plain ASCII letter or digit goes: apostrophes, hyphens, spaces.
      .replace(/[^a-z0-9]/g, "")
  );
}

/**
 * Splits a legal name into first and last parts.
 *
 * The surname is taken as the LAST whitespace-separated token, so multi-part given names
 * and compound surnames both behave sensibly:
 *   "Lily Von Der Becke"  → first "lily",  last "becke"  → initial "v"?  NO — see below.
 *
 * ⚠️  For the surname INITIAL the school's rule is the first letter of the surname as
 * written, which for "Von Der Becke" is "V". So the initial comes from the first
 * surname token, not the last. That is why this returns the whole surname remainder and
 * `surnameInitial` reads its first character.
 */
export function splitLegalName(legalName: string): {
  first: string;
  surname: string;
} {
  const tokens = legalName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { first: "", surname: "" };
  if (tokens.length === 1) return { first: tokens[0], surname: "" };
  return {
    first: tokens[0],
    // Everything after the given name is the surname, particles included.
    surname: tokens.slice(1).join(" "),
  };
}

/** First letter of the surname as written — "Von Der Becke" → "v". */
export function surnameInitial(surname: string): string {
  return normalizeNamePart(surname).charAt(0);
}

export interface SchoolEmailInput {
  legalName: string;
  /** The student's date of birth. Only the calendar day and year are used. */
  dateOfBirth: Date;
}

/**
 * Builds the base local part, before any collision suffix.
 *
 * Both numbers are zero-padded to two digits. The school's stated rule says "2 digit year";
 * the day is padded to match for consistency, so a student born on the 5th gets `05` rather
 * than `5` and every address has the same shape. Flagging that choice because the rule as
 * spoken did not specify it.
 */
export function buildSchoolEmailLocalPart(input: SchoolEmailInput): string | null {
  const { first, surname } = splitLegalName(input.legalName);
  const firstPart = normalizeNamePart(first);
  const initial = surnameInitial(surname);

  // Without a usable given name or surname initial there is no address to build. The
  // caller surfaces this rather than inventing something.
  if (!firstPart || !initial) return null;

  const date = input.dateOfBirth;
  if (Number.isNaN(date.getTime())) return null;

  // UTC throughout: the stored date is a calendar fact, and reading it in local time would
  // shift the day for anyone west of UTC.
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = String(date.getUTCFullYear() % 100).padStart(2, "0");

  return `${firstPart}${day}${initial}${year}`;
}

/**
 * The full address for a student, before collision checking.
 * Returns null when the name or date is unusable.
 */
export function buildSchoolEmail(input: SchoolEmailInput): string | null {
  const local = buildSchoolEmailLocalPart(input);
  return local ? `${local}@${SCHOOL_EMAIL_DOMAIN}` : null;
}

/**
 * Resolves a collision against addresses already issued.
 *
 * COLLISIONS ARE REAL, not theoretical. The format encodes only a given name, a day, a
 * single surname letter, and a year — so two genuinely different students collide whenever
 * those four agree. Lily Vasquez born 16 March 2013 and Lily Von Der Becke born
 * 16 August 2013 both produce `lily16v13`. The month is not in the format at all.
 *
 * Rather than silently issuing a duplicate — which Office 365 would reject, or worse,
 * would deliver one child's mail to another — a numeric suffix is appended:
 *   lily16v13 → lily16v13.2 → lily16v13.3
 *
 * A dot is used as the separator because Office 365 permits it in a local part and it reads
 * as a deliberate variant rather than a typo.
 *
 * `taken` is the set of local parts already in use (case-insensitive).
 */
export function resolveCollision(
  baseLocalPart: string,
  taken: Iterable<string>,
): { localPart: string; collided: boolean } {
  const used = new Set(
    [...taken].map((e) => e.split("@")[0]?.toLowerCase()).filter(Boolean),
  );

  if (!used.has(baseLocalPart.toLowerCase())) {
    return { localPart: baseLocalPart, collided: false };
  }

  // Bounded loop — 99 same-named, same-birthday students is far beyond plausible, and an
  // unbounded loop on bad data is worse than a clear failure.
  for (let n = 2; n <= 99; n += 1) {
    const candidate = `${baseLocalPart}.${n}`;
    if (!used.has(candidate.toLowerCase())) {
      return { localPart: candidate, collided: true };
    }
  }

  throw new Error(
    `Could not generate a unique school email from "${baseLocalPart}" — 99 variants are already in use.`,
  );
}

/**
 * Basic shape validation for an address an administrator typed by hand.
 *
 * Deliberately permissive: the school may need to deviate from the generated pattern for a
 * real reason, and this only rejects what Office 365 certainly will.
 */
export function isPlausibleSchoolEmail(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value.trim());
}
