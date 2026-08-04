"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { usersCollection } from "../db/collections";
import { verifyPassword, getDecoyHash, MAX_PASSWORD_LENGTH } from "../auth/password";
import { signSession, setSessionCookie, clearSessionCookie } from "../auth/session";
import {
  consumeRateLimit,
  resetRateLimit,
  hashIdentifier,
  RATE_LIMITS,
} from "../auth/rate-limit";
import { verifySession } from "../dal";
import { logAudit, logFailedLogin, getClientIp } from "../audit";
import { type ActionState, guardAction, failure, fromZodError } from "./types";

/**
 * AUTHENTICATION ACTIONS
 * =============================================================================
 * Login and logout.
 *
 * These are the only actions in the app that are legitimately unauthenticated, so
 * the abuse controls are correspondingly tighter.
 */

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Enter your email address")
    .max(320)
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(1, "Enter your password")
    .max(MAX_PASSWORD_LENGTH, "Password is too long"),
});

/**
 * The single message returned for every authentication failure.
 *
 * Wrong password, unknown email, and deactivated account are deliberately
 * indistinguishable. Anything more specific is an account-enumeration oracle: an
 * attacker could confirm which parents have accounts at this school, which is both
 * a privacy leak and a phishing target list.
 */
const INVALID_CREDENTIALS = "Email or password is incorrect.";

export async function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction(async () => {
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) return fromZodError(parsed.error);

    const { email, password } = parsed.data;

    // --- Abuse control, before any expensive work ---------------------------
    const ip = await getClientIp();
    const emailKey = `login:email:${hashIdentifier(email)}`;
    const ipKey = ip ? `login:ip:${hashIdentifier(ip)}` : null;

    const emailLimit = await consumeRateLimit(
      emailKey,
      RATE_LIMITS.LOGIN_PER_EMAIL.limit,
      RATE_LIMITS.LOGIN_PER_EMAIL.windowSeconds,
    );
    const ipLimit = ipKey
      ? await consumeRateLimit(
          ipKey,
          RATE_LIMITS.LOGIN_PER_IP.limit,
          RATE_LIMITS.LOGIN_PER_IP.windowSeconds,
        )
      : { allowed: true };

    if (!emailLimit.allowed || !ipLimit.allowed) {
      // Lockout is stated plainly. Unlike credential errors, this leaks nothing
      // an attacker does not already know (they made the attempts), and a real
      // user locked out needs to understand why.
      return failure(
        "Too many sign-in attempts. Please wait 15 minutes and try again.",
      );
    }

    // --- Credential check --------------------------------------------------
    const users = await usersCollection();
    const user = await users.findOne(
      { email },
      {
        projection: {
          email: 1,
          name: 1,
          role: 1,
          active: 1,
          passwordHash: 1,
          sessionEpoch: 1,
          archivedAt: 1,
        },
      },
    );

    // Hash against a decoy when the account does not exist, so the unknown-email
    // path costs the same as the wrong-password path. Skipping this would leave a
    // timing oracle that reveals which addresses are registered.
    const hashToCheck = user?.passwordHash ?? (await getDecoyHash());
    const passwordValid = await verifyPassword(hashToCheck, password);

    const usable = Boolean(user && user.active && !user.archivedAt);
    if (!user || !passwordValid || !usable) {
      await logFailedLogin(email);
      return failure(INVALID_CREDENTIALS);
    }

    // --- Success -----------------------------------------------------------
    await resetRateLimit(emailKey);

    const token = await signSession({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      epoch: user.sessionEpoch,
    });
    await setSessionCookie(token);

    await users.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date(), updatedAt: new Date() } },
    );

    await logAudit({
      actor: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        assignedStudentIds: [],
        studentIds: [],
      },
      action: "auth.login",
    });

    // Destination by role. Note this is NOT taken from a `next` query parameter:
    // an attacker-supplied redirect target is an open-redirect vulnerability, and
    // a role-based landing page is what a user actually wants anyway.
    redirect(user.role === "parent" ? "/portal" : "/admin");
  });
}

export async function logoutAction(): Promise<void> {
  const user = await verifySession();
  if (user) {
    await logAudit({ actor: user, action: "auth.logout" });
  }
  await clearSessionCookie();
  redirect("/login");
}

/**
 * Invalidates every session for a user by bumping their session epoch.
 *
 * Called on password change, role change, and deactivation. This is what makes a
 * stateless JWT revocable — see the epoch check in lib/dal.ts.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  const users = await usersCollection();
  await users.updateOne(
    { _id: new ObjectId(userId) },
    { $inc: { sessionEpoch: 1 }, $set: { updatedAt: new Date() } },
  );
}
