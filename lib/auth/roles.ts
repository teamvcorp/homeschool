import type { Role, Capability } from "../db/enums";
import { ROLE_CAPABILITIES } from "../db/enums";

/**
 * CAPABILITY CHECKS
 * =============================================================================
 * Authorization is expressed as capabilities, not role-string comparisons.
 *
 * The difference matters when a fourth role appears: with `role === "admin"`
 * scattered across forty call sites, adding an "office manager" who may read
 * applications but not financials means auditing all forty. With capabilities,
 * it means one row in ROLE_CAPABILITIES.
 *
 * This module is intentionally dependency-free and side-effect-free so it can be
 * unit tested and imported anywhere, including the proxy.
 */

export function can(role: Role, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export function canAny(role: Role, capabilities: readonly Capability[]): boolean {
  return capabilities.some((c) => can(role, c));
}

export function canAll(role: Role, capabilities: readonly Capability[]): boolean {
  return capabilities.every((c) => can(role, c));
}

/**
 * Whether this role may see a given student's records at all.
 *
 * Scope is a separate question from capability, and both must pass:
 *  - admin: every student
 *  - instructor: only students assigned to them
 *  - parent: only their own children
 *
 * The caller supplies the id lists from the authenticated user record — never
 * from the request — so a forged parameter cannot widen scope.
 */
export function isStudentInScope(
  role: Role,
  studentId: string,
  scope: { assignedStudentIds?: string[]; studentIds?: string[] },
): boolean {
  switch (role) {
    case "admin":
      return true;
    case "instructor":
      return scope.assignedStudentIds?.includes(studentId) ?? false;
    case "parent":
      return scope.studentIds?.includes(studentId) ?? false;
    default:
      // Exhaustiveness guard: a new role added to the enum without a case here
      // fails closed (no access) rather than falling through to allow.
      return false;
  }
}

/** Human-readable role labels for the admin UI. */
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  instructor: "Instructor",
  parent: "Parent / Guardian",
};
