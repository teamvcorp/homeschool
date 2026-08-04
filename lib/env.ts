import "server-only";
import { z } from "zod";

/**
 * ENVIRONMENT CONTRACT
 * =============================================================================
 * Parsed once, eagerly, at module load. A missing or malformed secret becomes a
 * loud startup failure instead of a mysterious runtime 500 three screens into
 * the enrollment wizard.
 *
 * `import "server-only"` makes it a BUILD ERROR for any Client Component to
 * import this file, even transitively. That is the guardrail that stops a secret
 * from being bundled into browser JavaScript. Note it needs no npm install —
 * Next declares the module and aliases it internally.
 *
 * Adding a variable: add it here, add it to .env.example with an empty value,
 * and document what it is for. Never read process.env directly elsewhere.
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

  /** Database name. Defaults so a URI without a path still works. */
  MONGODB_DB: z.string().min(1).default("va_school"),

  /**
   * Signs session JWTs. Must be at least 32 bytes of real entropy — this single
   * value is what stands between a visitor and forging an admin session.
   * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   */
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters of random data"),

  /**
   * Signs enrollment draft cookies and form-issue timestamps. Kept separate from
   * SESSION_SECRET so rotating one does not invalidate the other, and so a leak
   * of the lower-value form secret cannot mint admin sessions.
   */
  FORM_HMAC_SECRET: z
    .string()
    .min(32, "FORM_HMAC_SECRET must be at least 32 characters of random data"),

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

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // z.flattenError is the zod v4 API. (The Next docs' examples still show v3's
  // error.flatten() — that method does not exist here.)
  const { fieldErrors } = z.flattenError(parsed.error);
  const details = Object.entries(fieldErrors)
    .map(([key, errors]) => `  ${key}: ${errors?.join("; ")}`)
    .join("\n");

  throw new Error(
    `Invalid environment configuration.\n${details}\n\n` +
      `Set these in .env.local (git-ignored). See .env.example for the full list.`,
  );
}

export const env = parsed.data;

/** True in production. Used to require `secure` cookies only where TLS exists. */
export const isProduction = env.NODE_ENV === "production";
