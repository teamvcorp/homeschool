import "server-only";
import { cache } from "react";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getSessionToken, verifySessionToken } from "./auth/session";
import { usersCollection } from "./db/collections";
import { can, canAny, isStudentInScope } from "./auth/roles";
import type { Role, Capability } from "./db/enums";

/**
 * DATA ACCESS LAYER — THE AUTHORIZATION BOUNDARY
 * =============================================================================
 * This is the ONLY place the app decides who someone is. Everything else asks.
 *
 * WHY IT EXISTS RATHER THAN TRUSTING proxy.ts
 * Next's own docs are explicit that the proxy cannot be the security boundary:
 * Server Functions are POSTed to the route where they are used, so a proxy matcher
 * that excludes a path also skips the Server Function calls on that path — and
 * Server Functions are reachable by direct POST, not only through the UI. A
 * `fetch` from curl never passes through a route the proxy guards.
 *
 * So: proxy.ts does optimistic redirects for UX. THIS file enforces access. Every
 * page and every server action that touches protected data calls one of these.
 *
 * WHY React `cache()`
 * A single request may check the session in a layout, a page, and three server
 * actions. cache() dedupes those to one token verification and one database read
 * per request, without any of the callers coordinating.
 *
 * WHY THE DATABASE IS CONSULTED AT ALL
 * A valid signature only proves we minted the token. It says nothing about whether
 * the account was since deactivated, demoted, or had its password changed. The
 * epoch check below is what makes a stateless token revocable.
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Instructor scope. */
  assignedStudentIds: string[];
  /** Guardian scope. */
  studentIds: string[];
}

/**
 * Resolves the current user, or null if unauthenticated.
 *
 * Returns null — never throws — so a page can render a public variant. Use
 * `requireUser()` when access is mandatory.
 */
export const verifySession = cache(async (): Promise<AuthenticatedUser | null> => {
  const token = await getSessionToken();
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  // The token is authentic. Now confirm the account still exists and still holds
  // the claims the token asserts.
  if (!ObjectId.isValid(payload.userId)) return null;

  const users = await usersCollection();
  const user = await users.findOne(
    { _id: new ObjectId(payload.userId) },
    {
      // Explicit projection: passwordHash must never be loaded into a value that
      // could be returned or logged.
      projection: {
        email: 1,
        name: 1,
        role: 1,
        active: 1,
        sessionEpoch: 1,
        assignedStudentIds: 1,
        studentIds: 1,
        archivedAt: 1,
      },
    },
  );

  if (!user) return null;
  // Deactivated or archived accounts are rejected even with a valid token.
  if (!user.active || user.archivedAt) return null;
  // Revocation check — a bumped epoch invalidates every token issued before it.
  if (user.sessionEpoch !== payload.epoch) return null;
  // A role change since the token was issued invalidates it too, rather than
  // silently honouring stale (possibly higher) privileges.
  if (user.role !== payload.role) return null;

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    assignedStudentIds: (user.assignedStudentIds ?? []).map((id) => id.toString()),
    studentIds: (user.studentIds ?? []).map((id) => id.toString()),
  };
});

/**
 * Requires any authenticated user.
 *
 * In a page: redirects to /login. In a server action, prefer `requireUserOrThrow`
 * so the failure surfaces as an error rather than a redirect the client may not
 * follow as intended.
 */
export async function requireUser(
  redirectTo: Route = "/login",
): Promise<AuthenticatedUser> {
  const user = await verifySession();
  if (!user) redirect(redirectTo);
  return user;
}

/**
 * Authorization error. Carries no detail about what was attempted — an error
 * message is an information channel, and "no such student" versus "not your
 * student" is exactly the distinction an attacker wants.
 */
export class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Requires authentication, throwing rather than redirecting. For server actions. */
export async function requireUserOrThrow(): Promise<AuthenticatedUser> {
  const user = await verifySession();
  if (!user) throw new AuthorizationError("Not authenticated");
  return user;
}

/**
 * Requires a specific capability.
 *
 * THE FIRST LINE OF EVERY PROTECTED SERVER ACTION SHOULD BE A CALL TO THIS.
 * Before parsing input, before touching the database.
 */
export async function requireCapability(
  capability: Capability,
): Promise<AuthenticatedUser> {
  const user = await requireUserOrThrow();
  if (!can(user.role, capability)) {
    throw new AuthorizationError();
  }
  return user;
}

/** Requires at least one of several capabilities. */
export async function requireAnyCapability(
  capabilities: readonly Capability[],
): Promise<AuthenticatedUser> {
  const user = await requireUserOrThrow();
  if (!canAny(user.role, capabilities)) {
    throw new AuthorizationError();
  }
  return user;
}

/**
 * Requires that the caller may access this particular student.
 *
 * Two separate gates, both required:
 *  1. capability — may this ROLE read student records at all?
 *  2. scope      — is THIS student within the caller's reach?
 *
 * Scope is computed from the stored user document, never from request input, so a
 * tampered form field or URL cannot widen it.
 */
export async function requireStudentAccess(
  studentId: string,
  mode: "read" | "write" = "read",
): Promise<AuthenticatedUser> {
  const user = await requireUserOrThrow();

  const readCapabilities: Capability[] = [
    "records:read:all",
    "records:read:assigned",
    "records:read:own-children",
  ];
  const required: readonly Capability[] =
    mode === "write" ? (["records:write"] as const) : readCapabilities;

  if (!canAny(user.role, required)) throw new AuthorizationError();

  if (
    !isStudentInScope(user.role, studentId, {
      assignedStudentIds: user.assignedStudentIds,
      studentIds: user.studentIds,
    })
  ) {
    throw new AuthorizationError();
  }

  return user;
}

/** Convenience predicate for conditionally rendering UI. Never a security gate. */
export async function hasCapability(capability: Capability): Promise<boolean> {
  const user = await verifySession();
  return user ? can(user.role, capability) : false;
}
