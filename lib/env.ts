import "server-only";
import { z } from "zod";

/**
 * ENVIRONMENT CONTRACT
 * =============================================================================
 * `import "server-only"` makes it a BUILD ERROR for any Client Component to import
 * this file, even transitively — that is the guardrail stopping a secret from being
 * bundled into browser JavaScript. It needs no npm install for the app; Next
 * declares and aliases the module internally.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY VALIDATION IS LAZY
 *
 * The first version of this file parsed eagerly at module load. That looked like
 * good "fail fast" practice and was actually a bug: `next build` imports the module
 * graph of every route to collect page data, so importing this file threw during the
 * BUILD whenever a secret was absent. That broke deployment on Vercel (where secrets
 * are runtime configuration) and would break any CI build.
 *
 * Secrets are a RUNTIME requirement, not a build-time one. So validation now happens
 * on first property access and the result is cached. The failure is still loud and
 * still immediate — it just happens when something actually needs a secret, rather
 * than when a bundler walks past the file.
 *
 * Adding a variable: add it to the schema, add it to .env.example with an empty
 * value, and document what it is for. Never read process.env directly elsewhere.
 */

const schema = z.object({
  /** MongoDB Atlas connection string. */
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine(
      (v) => v.startsWith("mongodb://") || v.startsWith("mongodb+srv://"),
      "MONGODB_URI must start with mongodb:// or mongodb+srv://",
    ),

  /**
   * Database name. DELIBERATELY HAS NO DEFAULT OUTSIDE PRODUCTION — see
   * resolveDatabaseName() below for why that matters more than the convenience.
   */
  MONGODB_DB: z.string().min(1).optional(),

  /**
   * Signs session JWTs. At least 32 bytes of real entropy — this single value is
   * what stands between a visitor and forging an admin session.
   * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   */
  SESSION_SECRET: z
    .string()
    .trim()
    .min(32, "SESSION_SECRET must be at least 32 characters of random data"),

  /**
   * Signs enrollment draft cookies and form-issue timestamps. Kept separate from
   * SESSION_SECRET so rotating one does not invalidate the other, and so a leak of
   * the lower-value form secret cannot mint admin sessions.
   *
   * ⚠️  `.trim()` IS LOAD-BEARING. A secret pasted into the Vercel dashboard very often
   * arrives with a trailing newline, and a secret that differs by whitespace between
   * two environments makes every form served by one deployment fail HMAC verification
   * at the other. The visitor sees the generic "we could not process that submission"
   * — indistinguishable from the honeypot bug this file's sibling comments describe.
   * lib/forms/hmac.ts additionally verifies against the UNtrimmed value so that adding
   * this trim did not itself invalidate in-flight forms.
   */
  FORM_HMAC_SECRET: z
    .string()
    .trim()
    .min(32, "FORM_HMAC_SECRET must be at least 32 characters of random data"),

  /**
   * The PREVIOUS form secret, accepted at verification only, for the duration of a
   * rotation. Optional and normally unset.
   *
   * Without this, rotating FORM_HMAC_SECRET instantly invalidates every form already
   * served and every draft cookie already issued — every family mid-agreement is
   * bounced to the start. Set it to the old value, deploy, wait longer than
   * MAX_FORM_AGE_MS (12h), then remove it.
   */
  FORM_HMAC_SECRET_PREVIOUS: z
    .string()
    .trim()
    .min(32, "FORM_HMAC_SECRET_PREVIOUS must be at least 32 characters of random data")
    .optional(),

  /** Transactional email. */
  RESEND_API_KEY: z.string().min(1).optional(),
  /** Must be on a Resend-verified domain (fyht4.com). */
  EMAIL_FROM: z.string().email().default("enrollment@fyht4.com"),
  /** Where enrollment notifications go. */
  SCHOOL_NOTIFICATION_EMAIL: z.string().email().default("teamvcorp@thevacorp.com"),

  /** Absolute origin, used for links in email and for OG/JSON-LD URLs. */
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

  /** Protects the email-retry route handler from public invocation. */
  CRON_SECRET: z.string().min(16).optional(),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

type RawEnv = z.infer<typeof schema>;

/** MONGODB_DB is resolved and guaranteed present by the time callers see it. */
export type Env = Omit<RawEnv, "MONGODB_DB"> & { MONGODB_DB: string };

/**
 * The live database. Named here in code ON PURPOSE — it is the thing being protected,
 * and a guard that reads its own boundary out of configuration guards nothing.
 */
export const PRODUCTION_DB_NAME = "va_school";

/** Names that must never be the target of a production deployment. */
const NON_PRODUCTION_PATTERN = /test|dev|staging|sandbox|scratch|tmp/i;

/**
 * SEPARATION OF DEVELOPMENT AND PRODUCTION DATA.
 * ---------------------------------------------------------------------------
 * This function exists because of a real incident on this project: a destructive test
 * helper was run against the LIVE database and permanently destroyed a family's
 * enrollment application.
 *
 * The mechanism that allowed it was a one-line convenience — MONGODB_DB used to default
 * to "va_school", the production database. So forgetting to set it did not fail; it
 * silently connected local development, and anything local development did, to live
 * records. A default that points at production means the SAFE path requires remembering
 * something, and the DANGEROUS path is what happens when you forget. That is backwards.
 *
 * Now:
 *   - Outside production, MONGODB_DB is REQUIRED. Forgetting it is a loud error.
 *   - Outside production, naming the production database is REFUSED outright.
 *   - In production, a database name that looks like a test database is REFUSED, because
 *     silently serving an empty school is its own kind of outage.
 *
 * ESCAPE HATCH: some operations against production are legitimate and necessary — seeding
 * the first administrator, creating indexes. Those set ALLOW_PRODUCTION_DB=1 explicitly
 * for that one command:
 *
 *     ALLOW_PRODUCTION_DB=1 MONGODB_DB=va_school npm run seed:admin -- --email ...
 *
 * The override is per-invocation and has to be typed out, which is the point: it makes
 * touching live data a deliberate act rather than a forgotten variable.
 */
function resolveDatabaseName(raw: RawEnv): string {
  const isProd = raw.NODE_ENV === "production";
  const allowProductionDb = process.env.ALLOW_PRODUCTION_DB === "1";

  // In production the production database is the correct default. Everywhere else,
  // there is no safe default, so there is no default.
  const name = raw.MONGODB_DB ?? (isProd ? PRODUCTION_DB_NAME : undefined);

  if (!name) {
    throw new Error(
      `MONGODB_DB is not set.\n\n` +
        `  Outside production this has no default, on purpose: it used to default to\n` +
        `  "${PRODUCTION_DB_NAME}" (the LIVE database), so forgetting it pointed local\n` +
        `  development at real student records.\n\n` +
        `  Set it in .env.local — for local work use a test database:\n` +
        `      MONGODB_DB=va_school_test\n`,
    );
  }

  if (!isProd && name === PRODUCTION_DB_NAME && !allowProductionDb) {
    throw new Error(
      `REFUSING to use the production database "${name}" with NODE_ENV=${raw.NODE_ENV}.\n\n` +
        `  This is real student data, and local code paths include destructive test\n` +
        `  helpers. Use a test database instead:\n` +
        `      MONGODB_DB=va_school_test\n\n` +
        `  If you genuinely mean to act on live data (seeding an admin, creating\n` +
        `  indexes), say so explicitly for that one command:\n` +
        `      ALLOW_PRODUCTION_DB=1 MONGODB_DB=${PRODUCTION_DB_NAME} npm run <script>\n`,
    );
  }

  if (isProd && NON_PRODUCTION_PATTERN.test(name)) {
    throw new Error(
      `REFUSING to run a PRODUCTION deployment against "${name}".\n\n` +
        `  That name looks like a test database. Serving the live site from one would\n` +
        `  show an empty school and write real enrollments somewhere they will be lost.\n` +
        `  Set MONGODB_DB=${PRODUCTION_DB_NAME} in the production environment.\n`,
    );
  }

  return name;
}

let cached: Env | null = null;

/**
 * Validates and returns the environment. Parses once, then returns the cache.
 *
 * Throws a message naming every missing or malformed variable at once, rather than
 * making the operator rediscover them one deploy at a time.
 */
export function getEnv(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    // z.flattenError is the zod v4 API. (Next's bundled forms guide still shows
    // v3's error.flatten() method, which does not exist here.)
    const { fieldErrors } = z.flattenError(parsed.error);
    const details = Object.entries(fieldErrors)
      .map(([key, errors]) => `  ${key}: ${errors?.join("; ")}`)
      .join("\n");

    throw new Error(
      `Invalid environment configuration.\n${details}\n\n` +
        `Locally: set these in .env.local (git-ignored) — see .env.example.\n` +
        `On Vercel: Project → Settings → Environment Variables, then redeploy.`,
    );
  }

  // Resolved AFTER schema validation so the operator sees missing secrets and a
  // misdirected database in the same run rather than one per attempt.
  cached = { ...parsed.data, MONGODB_DB: resolveDatabaseName(parsed.data) };
  return cached;
}

/**
 * Ergonomic accessor: `env.SESSION_SECRET` reads the same as a plain object, but
 * validation is deferred to the moment a value is actually read.
 *
 * IMPORTANT FOR CALLERS: do not read from this at module scope in a file that a
 * route imports. Doing so re-creates the build-time failure this indirection exists
 * to prevent. Read inside a function instead — see lib/mongodb.ts and
 * lib/auth/session.ts for the pattern.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env];
  },
  has(_target, prop: string) {
    return prop in getEnv();
  },
  ownKeys() {
    return Reflect.ownKeys(getEnv());
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    return {
      value: getEnv()[prop as keyof Env],
      enumerable: true,
      configurable: true,
    };
  },
});

/**
 * Explicit up-front validation, for the CLI scripts in scripts/.
 *
 * A script SHOULD fail immediately with a complete list of what is missing, rather
 * than partway through its work — the build-time concern that motivates laziness in
 * the app does not apply to a script an operator ran deliberately.
 */
export function assertEnv(): Env {
  return getEnv();
}

/**
 * Read directly from process.env rather than through the schema.
 *
 * NODE_ENV is set by the toolchain in every environment and never needs validating,
 * so this is safe to call at module scope — which is exactly what makes it usable
 * for the dev-only branches that must not trigger secret validation.
 */
export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";

/**
 * The RAW, un-trimmed FORM_HMAC_SECRET exactly as the platform supplied it.
 *
 * The one deliberate exception to "never read process.env directly elsewhere", and it
 * exists for a single purpose: lib/forms/hmac.ts must be able to verify signatures that
 * were produced BEFORE the `.trim()` above was added. If the production secret carries a
 * trailing newline, the trim changes the effective key, and without this accessor every
 * form and draft cookie in flight at deploy time would start failing verification — i.e.
 * shipping the fix would reproduce the very bug it fixes, once, for everyone mid-form.
 *
 * Not part of the validated schema on purpose: it is a compatibility shim, and it should
 * be deletable in a later release once no pre-trim signature can still be in flight.
 */
export function untrimmedFormHmacSecret(): string | undefined {
  return process.env.FORM_HMAC_SECRET;
}
