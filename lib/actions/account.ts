"use server";

import { z } from "zod";
import { ObjectId } from "mongodb";
import { usersCollection } from "../db/collections";
import { hashPassword, verifyPassword, MAX_PASSWORD_LENGTH } from "../auth/password";
import {
  newPasswordShape,
  confirmationMatches,
  CONFIRMATION_MISMATCH,
} from "../validation/password";
import { signSession, setSessionCookie } from "../auth/session";
import { consumeRateLimit, resetRateLimit, hashIdentifier, RATE_LIMITS } from "../auth/rate-limit";
import { verifySession } from "../dal";
import { logAudit } from "../audit";
import { type ActionState, guardAction, failure, success, fromZodError } from "./types";

/**
 * ACCOUNT ACTIONS — CHANGING YOUR OWN PASSWORD
 * =============================================================================
 * This did not exist until now, which meant the password `scripts/seed-admin.ts` generates
 * and prints once was the password the account kept forever. `seed-admin.ts` even claimed the
 * account was "flagged so the admin UI can require a change on first sign-in" — there was no
 * flag and no UI. The comment has been corrected along with this file.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE CURRENT PASSWORD IS REQUIRED
 *
 * The session alone is not sufficient authority to change the credential that the session
 * was minted from. Without re-authentication, anyone who reaches an unlocked laptop, a
 * borrowed phone, or a machine left signed in at the school can silently take the account
 * permanently — change the password, and the real owner is locked out of the system that
 * holds every student record.
 *
 * Requiring the current password turns "temporary physical access" back into "needs the
 * secret", which is the whole point of having one.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY EVERY OTHER SESSION IS REVOKED, AND WHY THIS ONE IS NOT
 *
 * Changing a password is what someone does when they think it may be known to someone else.
 * If existing sessions survived that, the change would be theatre: the attacker's session
 * keeps working and the owner believes they have fixed it.
 *
 * `revokeUserSessions` bumps `sessionEpoch`, and lib/dal.ts rejects any token carrying an
 * older epoch — that is what makes a stateless JWT revocable here. It also invalidates the
 * CALLER'S OWN token, so a fresh one is issued immediately afterwards. Without that, changing
 * your password would sign you out at the moment of success, which reads as a failure and
 * teaches people not to do it.
 */

/**
 * The length and confirmation rules live in lib/validation/password.ts, shared with the
 * reset-from-email flow — see that file for why they must not drift apart. Only the
 * current-password field and the "must actually be a change" rule are specific here.
 */
const changePasswordSchema = z
  .object({
    ...newPasswordShape,
    currentPassword: z
      .string()
      .min(1, "Enter your current password")
      .max(MAX_PASSWORD_LENGTH),
  })
  .refine(confirmationMatches, CONFIRMATION_MISMATCH)
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "The new password must be different from the current one",
    path: ["newPassword"],
  });

export async function changePasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction("changePassword", async () => {
    const user = await verifySession();
    if (!user) return failure("Your session has expired. Please sign in again.");

    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) return fromZodError(parsed.error);

    const { currentPassword, newPassword } = parsed.data;

    /**
     * Charged BEFORE the password is verified, so a wrong guess costs the attempt whether or
     * not it was close. Keyed by user rather than by IP: the account is what is under attack,
     * and an attacker with the session cookie can change IP freely.
     */
    const limitKey = `password-change:${hashIdentifier(user.id)}`;
    const limit = await consumeRateLimit(
      limitKey,
      RATE_LIMITS.PASSWORD_CHANGE_PER_USER.limit,
      RATE_LIMITS.PASSWORD_CHANGE_PER_USER.windowSeconds,
    );
    if (!limit.allowed) {
      return failure("Too many attempts. Please wait 15 minutes and try again.");
    }

    const users = await usersCollection();
    const record = await users.findOne(
      { _id: new ObjectId(user.id) },
      { projection: { passwordHash: 1, sessionEpoch: 1, email: 1, role: 1 } },
    );
    if (!record) return failure("Your session has expired. Please sign in again.");

    const currentValid = await verifyPassword(record.passwordHash, currentPassword);
    if (!currentValid) {
      /**
       * No decoy hash needed here, unlike the login form: the account is already known to
       * exist because the caller is signed in as it, so there is no enumeration oracle to
       * protect against. The message can therefore be specific and useful.
       */
      return failure("That is not your current password.", {
        currentPassword: ["That is not your current password."],
      });
    }

    const now = new Date();
    const newHash = await hashPassword(newPassword);

    /**
     * One update: the new hash AND the epoch bump together. Doing these as two writes would
     * leave a window where the password had changed but old sessions still worked — small,
     * but this is precisely the operation where that window matters.
     */
    const updated = await users.findOneAndUpdate(
      { _id: new ObjectId(user.id) },
      {
        $set: { passwordHash: newHash, updatedAt: now },
        $inc: { sessionEpoch: 1 },
      },
      { returnDocument: "after", projection: { sessionEpoch: 1, email: 1, role: 1 } },
    );

    if (!updated) return failure("Your session has expired. Please sign in again.");

    // Re-issue THIS device's session against the new epoch. See the header.
    const token = await signSession({
      userId: user.id,
      email: updated.email,
      role: updated.role,
      epoch: updated.sessionEpoch,
    });
    await setSessionCookie(token);

    // The attempt counter is cleared on success, so an honest fumble does not persist.
    await resetRateLimit(limitKey);

    await logAudit({ actor: user, action: "auth.passwordChanged" });

    return success(undefined, "Your password has been changed. Any other devices signed in to this account have been signed out.");
  });
}
