"use server";

import { z } from "zod";
import { usersCollection } from "../db/collections";
import { hashPassword } from "../auth/password";
import { createToken, consumeToken, TOKEN_TTL_MS } from "../auth/token";
import {
  consumeRateLimit,
  hashIdentifier,
  RATE_LIMITS,
} from "../auth/rate-limit";
import {
  newPasswordShape,
  confirmationMatches,
  CONFIRMATION_MISMATCH,
} from "../validation/password";
import { passwordResetEmail } from "../email/templates";
import { sendEmail } from "../email/send";
import { getLocale } from "../i18n/server";
import { env } from "../env";
import { logAudit, getClientIp } from "../audit";
import { type ActionState, guardAction, failure, success, fromZodError } from "./types";

/**
 * PASSWORD RESET — THE UNAUTHENTICATED HALF
 * =============================================================================
 * /account can change a password. It cannot help the one person who most needs help:
 * someone who cannot sign in. Until this existed, a forgotten password meant editing the
 * database by hand, and `scripts/seed-admin.ts` told the operator to "use the admin UI"
 * for a reset — a UI that never existed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ONE RULE THAT SHAPES EVERYTHING HERE: NO ENUMERATION
 *
 * This form takes an email address from an anonymous stranger and is willing to tell them
 * something about it. That makes it the single easiest account-enumeration oracle in the
 * app — easier than the login form, because it needs no password guess at all. A response
 * that differed for a known address would hand anyone a way to confirm which families
 * have accounts at this school: a privacy leak, and a ready-made phishing target list for
 * a system holding minors' records.
 *
 * So `requestPasswordReset` returns THE SAME ActionState in every case:
 *   - address has an active account          → mail sent
 *   - address is unknown                     → nothing happens
 *   - account exists but is deactivated      → nothing happens
 *   - the caller has exhausted the rate limit → nothing happens
 *   - the mail provider failed outright      → nothing happens
 *
 * Note the fourth especially. The login form says "too many attempts" plainly, and that
 * is correct there — the attacker already knows they made the attempts, and a locked-out
 * user needs to understand why. Here it would be a tell: a limit charged per EMAIL only
 * trips for an address someone is repeatedly targeting, so "too many attempts" would
 * confirm the address is worth targeting. Silence costs an honest user one wasted retry.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A SUCCESSFUL RESET DOES NOT SIGN YOU IN
 *
 * `changePasswordAction` re-issues a session cookie, because the caller proved who they
 * were by typing their current password. Here the only evidence is possession of a link
 * from an inbox we cannot vouch for. Making them sign in afterwards costs one screen and
 * confirms the new password actually works — which is worth more than the convenience.
 */

/**
 * The single response to every reset request. Deliberately `ok: true` in all cases: it is
 * a statement about what WOULD happen, not a claim that mail was sent.
 *
 * The wording is conditional on purpose ("if that address has an account"), so it is
 * honest in the case where nothing was sent rather than a lie the UI tells for security.
 */
const RESET_REQUESTED = () =>
  success(
    undefined,
    "If that address has an account, we have sent a link to reset the password. It is good for one hour. Check spam if it does not arrive within a few minutes.",
  );

const requestSchema = z.object({
  email: z
    .string()
    .min(1, "Enter your email address")
    .max(320)
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase().trim()),
});

export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction("requestPasswordReset", async () => {
    const parsed = requestSchema.safeParse({ email: formData.get("email") });
    /**
     * The ONLY branch that returns something different. A malformed address is a typo,
     * not an enumeration probe — it tells an attacker nothing, because they already know
     * whether what they typed was a valid address.
     */
    if (!parsed.success) return fromZodError(parsed.error);

    const { email } = parsed.data;
    const ip = await getClientIp();

    /**
     * Charged BEFORE the lookup, and both counters always consumed.
     *
     * Per-email is the tight one (3/hour) because the resource being protected is a
     * stranger's inbox and the sending reputation of fyht4.com — this endpoint will mail
     * an address that someone else typed. Per-IP is loose (10/hour) so a school office or
     * a family behind one NAT cannot lock each other out.
     */
    const emailLimit = await consumeRateLimit(
      `password-reset:email:${hashIdentifier(email)}`,
      RATE_LIMITS.PASSWORD_RESET_REQUEST_PER_EMAIL.limit,
      RATE_LIMITS.PASSWORD_RESET_REQUEST_PER_EMAIL.windowSeconds,
    );
    const ipLimit = ip
      ? await consumeRateLimit(
          `password-reset:ip:${hashIdentifier(ip)}`,
          RATE_LIMITS.PASSWORD_RESET_REQUEST_PER_IP.limit,
          RATE_LIMITS.PASSWORD_RESET_REQUEST_PER_IP.windowSeconds,
        )
      : { allowed: true };

    /**
     * Audited on every request, matched or not — the same contract as `logFailedLogin`.
     * A burst against one address is the signal worth having, and it only exists if the
     * unmatched attempts are recorded too.
     */
    await logAudit({
      actor: null,
      action: "auth.passwordResetRequested",
      meta: { email, throttled: !emailLimit.allowed || !ipLimit.allowed },
    });

    if (!emailLimit.allowed || !ipLimit.allowed) return RESET_REQUESTED();

    const users = await usersCollection();
    const user = await users.findOne(
      { email },
      { projection: { _id: 1, active: 1, archivedAt: 1 } },
    );

    /**
     * Deactivated and archived accounts get nothing. An account that has been switched
     * off must not be reachable by resetting its password — that would make deactivation
     * reversible by anyone holding the old mailbox.
     */
    if (!user || !user.active || user.archivedAt) return RESET_REQUESTED();

    const rawToken = await createToken(
      { purpose: "reset", userId: user._id },
      TOKEN_TTL_MS.reset,
      ip,
    );

    /**
     * The visitor's chosen display language, from the language-lens cookie. A parent
     * reading the site in Spanish should not be sent an English reset mail. Falls back to
     * English when no choice has been made.
     */
    const locale = await getLocale();

    const resetUrl = `${env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const rendered = passwordResetEmail({ resetUrl, locale });

    /**
     * `sendEmail` directly rather than `notifyFamily`, for two reasons.
     *
     * The global daily breaker `notifyFamily` charges exists to stop the PUBLIC
     * enrollment form relaying school-branded mail to strangers. A reset only ever goes
     * to an address that already has an account, and it is the one message that must not
     * be deferred an hour: it expires in one.
     *
     * `doNotPersist` keeps a live token out of the retry queue — see the long note on
     * that flag in lib/email/send.ts. A failed send is invisible to the caller anyway, so
     * the recovery is simply asking again, which mints a fresh token.
     */
    await sendEmail({
      to: email,
      ...rendered,
      template: "passwordReset",
      doNotPersist: true,
    });

    return RESET_REQUESTED();
  });
}

/* -------------------------------------------------------------------------- */

/**
 * What the visitor sees for a token that is missing, expired, already used, or minted
 * for a different purpose.
 *
 * One message for all four. The distinctions are recorded server-side (see
 * `TokenFailure`) but must not be shown: telling someone that a link "has expired"
 * rather than "was never valid" confirms it was once real, which is a small oracle for
 * anyone fishing with guessed or intercepted links.
 */
const BAD_TOKEN =
  "This link has expired or has already been used. Request a new one and we will send a fresh link.";

const resetSchema = z
  .object({
    ...newPasswordShape,
    // Length-bounded so a multi-megabyte "token" cannot reach the hasher.
    token: z.string().min(1).max(512),
  })
  .refine(confirmationMatches, CONFIRMATION_MISMATCH);

export async function resetPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction("resetPassword", async () => {
    const ip = await getClientIp();

    /**
     * Charged first, before the token is even hashed. Keyed by IP because there is no
     * account identity until the token resolves — and resolving it is the work being
     * bounded.
     */
    if (ip) {
      const limit = await consumeRateLimit(
        `password-reset-confirm:ip:${hashIdentifier(ip)}`,
        RATE_LIMITS.PASSWORD_RESET_CONFIRM_PER_IP.limit,
        RATE_LIMITS.PASSWORD_RESET_CONFIRM_PER_IP.windowSeconds,
      );
      if (!limit.allowed) {
        return failure("Too many attempts. Please wait 15 minutes and try again.");
      }
    }

    const parsed = resetSchema.safeParse({
      token: formData.get("token"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      /**
       * A weak or mistyped password must NOT burn the token — otherwise one fumbled
       * confirmation would send the visitor back to their inbox for a new link. The
       * validation runs before redemption precisely so the common mistake is recoverable.
       */
      return fromZodError(parsed.error);
    }

    const { token, newPassword } = parsed.data;

    /**
     * Redeem and burn, atomically, before the password is hashed. Two clicks on the same
     * link cannot both succeed — see `consumeToken`.
     */
    const claim = await consumeToken(token, "reset");
    if (!claim.ok) {
      console.warn(`[reset] token rejected — ${claim.reason}`);
      return failure(BAD_TOKEN);
    }

    // Narrowing: a "reset" claim always carries a userId. See AuthTokenSubject.
    if (claim.subject.purpose === "resume") return failure(BAD_TOKEN);
    const userId = claim.subject.userId;

    const users = await usersCollection();
    const now = new Date();

    /**
     * The new hash and the epoch bump in ONE write.
     *
     * The epoch bump is what makes this a real remedy rather than theatre. Resetting is
     * what someone does when they fear the account is compromised; if the attacker's
     * existing session survived, they would keep their access while the owner believed
     * the problem was fixed. lib/dal.ts rejects any token carrying a stale epoch, so
     * every signed-in device — the attacker's included — is signed out at this instant.
     *
     * Two writes would leave a window where the password had changed but old sessions
     * still verified. Small, and precisely the operation where it matters.
     *
     * `active` and `archivedAt` are re-checked in the FILTER, not just at request time:
     * an administrator may have deactivated the account in the hour since the link was
     * sent, and that decision must win.
     */
    const updated = await users.findOneAndUpdate(
      { _id: userId, active: true, archivedAt: { $in: [null, undefined] } },
      { $set: { passwordHash: await hashPassword(newPassword), updatedAt: now }, $inc: { sessionEpoch: 1 } },
      { returnDocument: "after", projection: { email: 1, name: 1, role: 1 } },
    );

    if (!updated) {
      // Deactivated, archived, or deleted between issuing and redeeming.
      return failure(BAD_TOKEN);
    }

    await logAudit({
      actor: {
        id: updated._id.toString(),
        email: updated.email,
        name: updated.name,
        role: updated.role,
        assignedStudentIds: [],
        studentIds: [],
      },
      action: "auth.passwordResetCompleted",
      subjectId: updated._id,
      subjectType: "user",
    });

    /**
     * No session is issued and no redirect is thrown — the form renders a "sign in" link
     * on success. See the header for why possession of an emailed link is not, by itself,
     * grounds for a session.
     */
    return success(
      undefined,
      "Your password has been changed. Any devices still signed in to this account have been signed out. You can sign in now with your new password.",
    );
  });
}
