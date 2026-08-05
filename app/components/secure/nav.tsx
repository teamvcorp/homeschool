import type { Route } from "next";

/**
 * Navigation for the authenticated areas.
 *
 * Shared so the header is identical across every admin screen. Note this is
 * presentation only — appearing in this list grants nothing. Each page still calls the
 * DAL, so a role that reaches a URL it should not see is turned away by the page, not
 * by the absence of a link.
 */
export const ADMIN_NAV: readonly { label: string; href: Route }[] = [
  { label: "Overview", href: "/admin" },
  { label: "Applications", href: "/admin/applications" },
  { label: "Students", href: "/admin/students" },
];

export const PORTAL_NAV: readonly { label: string; href: Route }[] = [
  { label: "My students", href: "/portal" },
];
