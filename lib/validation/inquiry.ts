import { z } from "zod";

/**
 * HOMESCHOOL AT HOME — INTEREST FORM VALIDATION
 * =============================================================================
 * The public write path for the $20/month support tier (see `homeschoolAtHome` in
 * lib/site.ts). It produces exactly one thing: a row in `inquiries` with type
 * "homeschoolAtHome" and status "new".
 *
 * ⚠️  THIS IS NOT AN ENROLLMENT, NOT AN AGREEMENT, AND NOT A SIGNATURE. Nothing here
 * may grow a CONSENT_VERSION, an agreement hash, or a signature envelope. That
 * machinery belongs to the enrollment agreement alone (lib/enrollment/), and copying
 * its shape here would blur a legal distinction the whole tier depends on: these
 * families remain independent homeschoolers under Iowa CPI.
 *
 * ⚠️  THE HELPERS BELOW DUPLICATE MODULE-PRIVATE ONES IN lib/validation/enrollment.ts,
 * ON PURPOSE. Extracting them to a shared module would mean editing the file that
 * defines the schemas behind a legally signed agreement, in a change that has nothing
 * to do with that agreement. The duplication is a few lines; the risk being avoided is
 * a hashed legal document. Extract it later, in a commit that does only that.
 *
 * ZOD v4: error customisation is `{ error: "..." }` and flattening is the top-level
 * `z.flattenError()`. Next's bundled forms guide shows v3 and does not apply here.
 */

const trimmed = z.string().trim();

const name = trimmed
  .min(1, "Your name is required")
  .max(120, "That name is longer than we can store");

/**
 * Lowercased HERE, in the schema, rather than at the call site.
 *
 * The per-email rate-limit key is hashed from this value (see lib/actions/inquiry.ts),
 * so normalising anywhere later would let "Jane@" and "jane@" buy two separate buckets.
 */
const email = trimmed
  .min(1, "Email address is required")
  .max(320, "That email address is longer than we can store")
  .email("Enter a valid email address")
  .transform((v) => v.toLowerCase());

/**
 * Normalised, not format-policed. Families write phone numbers a dozen ways and none of
 * them are wrong; a digit count is the only check that does not reject a real person.
 */
const optionalPhone = trimmed
  .max(40, "That phone number is longer than we can store")
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine(
    (v) => v === undefined || (v.match(/\d/g) ?? []).length >= 10,
    "Enter at least 10 digits, or leave this blank",
  );

/**
 * Number of children. Rendered as a <select> of 1–8 plus "9 or more", so this arrives as
 * a bounded string and is coerced here.
 *
 * Bounded rather than free-numeric because it becomes a monthly figure on a human's
 * screen, and a nine-child family is a phone call anyway.
 */
const childCount = z.coerce
  .number({ error: "Tell us how many children this is for" })
  .int()
  .min(1, "At least one child")
  .max(
    9,
    "For nine or more children, please call the school — we will work it out with you",
  );

export const homeschoolInterestSchema = z.object({
  name,
  email,
  phone: optionalPhone,
  childCount,

  /**
   * Free text ("K, 3rd, and 7th"). A grade enum would reject "pre-K", "9th-ish", and
   * every other way a homeschooling parent actually describes where their children are.
   */
  gradeLevels: trimmed
    .min(1, "Tell us roughly what grades your children are in")
    .max(200, "Please summarise — a phrase is enough"),

  /**
   * WHERE THE FAMILY LIVES — collected for one reason: in-person Taekwondo.
   *
   * This tier is sold to families too far from Storm Lake to attend daily, so the school
   * cannot promise dojo access without knowing whether the family can reach it. A town
   * name is the least the school can ask and still answer honestly.
   *
   * Free text, and deliberately NOT an address. This is a public unauthenticated
   * endpoint; a town is enough to judge driving range and nothing more is needed.
   */
  nearestTown: trimmed
    .min(1, "Tell us your town so we can say whether Taekwondo works for you")
    .max(120, "A town or city name is enough"),

  taekwondoInterest: z.enum(["yes", "maybe", "no"], {
    error: "Let us know whether Taekwondo is of interest",
  }),

  currentSituation: z.enum(
    ["homeschoolingNow", "consideringHomeschool", "leavingAnotherSchool", "other"],
    { error: "Choose the option closest to your situation" },
  ),

  message: trimmed
    .max(2000, "This is longer than we can store — please summarise")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),

  /**
   * ⚠️  NOT A LEGAL SIGNATURE, AND MUST NEVER BE MODELLED ON ONE.
   *
   * A plain "did you read the important sentence" checkbox, so that no family later
   * discovers the school is not their school of record and is not reporting for them.
   * It records nothing and proves nothing; it exists to make the sentence unmissable.
   *
   * The sentence itself (`homeschoolAtHome.independenceStatement`) is rendered as a <p>
   * ABOVE the checkbox, not as the label — the Language Lens cannot translate text
   * inside a <label>, and this is the one sentence a non-English-reading family most
   * needs to understand.
   */
  understandsIndependentStatus: z.literal(true, {
    error: "Please confirm you understand this is not enrollment",
  }),
});

export type HomeschoolInterest = z.infer<typeof homeschoolInterestSchema>;
