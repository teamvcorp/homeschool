import { z } from "zod";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "../auth/password";

/**
 * PASSWORD RULES, IN ONE PLACE
 * =============================================================================
 * Three screens now let someone choose a password — /account (change your own),
 * /reset-password (from an emailed link), and the account-setup link a guardian
 * receives. They must agree, and not approximately: if the reset form accepted ten
 * characters while /account demanded twelve, the weaker path would silently become the
 * real policy, because an attacker picks the door with the lower bar.
 *
 * ⚠️  This module is transitively `server-only` — it imports lib/auth/password.ts, which
 * pulls in the Argon2id native module. A Client Component that needs the minimum length
 * for a `minLength` attribute takes it as a PROP from its server parent. Importing it
 * directly compiles, then breaks the build in a way that reads as unrelated. See the
 * note in app/(secure)/account/change-password-form.tsx.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY LENGTH AND NOT A CHARACTER-CLASS RULE
 *
 * No "must contain a symbol and a digit". Composition rules are well established to push
 * people toward `Password1!` and toward reuse, and NIST has recommended against them for
 * years. Length is the property that actually costs an attacker something, and the error
 * text below says so, because a rule people understand is a rule they cooperate with.
 */

/** The new-password field, with the wording used everywhere it appears. */
export const newPasswordField = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Use at least ${MIN_PASSWORD_LENGTH} characters. A short phrase you can remember is stronger than a short password you cannot.`,
  )
  .max(MAX_PASSWORD_LENGTH, "Password is too long");

/**
 * The two fields, as a spreadable shape rather than a finished schema.
 *
 * Deliberately NOT `z.object({...}).refine(...)`: a refined schema is no longer a plain
 * object schema, so a caller that needs one more field (the change form needs
 * `currentPassword`, the reset form needs `token`) cannot extend it. Every caller
 * therefore spreads this and applies `confirmationMatches` itself, which is one extra
 * line at each site and no type gymnastics at any of them.
 *
 * The confirmation field is not ceremony. This is the one input in the app that is
 * masked, submitted, and then required for all future access — a typo locks someone out
 * of a system holding student records, and the only recovery is the flow this serves.
 */
export const newPasswordShape = {
  newPassword: newPasswordField,
  confirmPassword: z.string().min(1, "Re-type the new password"),
};

/** Predicate for the `.refine()` every caller applies. */
export const confirmationMatches = (v: {
  newPassword: string;
  confirmPassword: string;
}): boolean => v.newPassword === v.confirmPassword;

/**
 * The error placement for the check above. On `confirmPassword`, not `newPassword` —
 * the field the person needs to look at is the one they mistyped second.
 */
export const CONFIRMATION_MISMATCH = {
  message: "The two new passwords do not match",
  path: ["confirmPassword"],
};
