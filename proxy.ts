import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * PROXY — OPTIMISTIC ROUTING ONLY. NOT A SECURITY BOUNDARY.
 * =============================================================================
 * In Next 16 the `middleware` convention was renamed to `proxy`. Notable
 * consequences:
 *   - This file must be named proxy.ts and live at the project root.
 *   - It must export a single function, default or named `proxy`.
 *   - Its runtime is Node.js and CANNOT be configured. Adding
 *     `export const runtime = ...` here throws.
 *   - The config flag `skipMiddlewareUrlNormalize` is now `skipProxyUrlNormalize`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS ONLY CHECKS FOR A COOKIE'S PRESENCE
 *
 * It would be natural to verify the JWT and look the user up here, and wrong.
 * Next's own documentation states that Server Functions "are handled as POST
 * requests to the route where they are used, so a Proxy matcher that excludes a
 * path will also skip Server Function calls on that path", and that they are
 * "reachable via direct POST requests, not just through your application's UI".
 *
 * So a proxy check is trivially bypassable for the operations that matter. Worse,
 * relying on it creates a false sense of safety. Next 16.2.1 also carried several
 * published proxy-bypass advisories (fixed in 16.3.0, which this project now
 * uses) — a good reminder that this layer is not where access decisions belong.
 *
 * The real enforcement is lib/dal.ts, called from every protected page and as the
 * FIRST statement of every protected server action. This file exists purely so a
 * signed-out visitor clicking /admin gets a login page instead of a flash of
 * empty dashboard.
 *
 * Corollary: a forged or expired cookie will pass this check. That is fine and
 * expected — the DAL rejects it a moment later.
 */

/** Routes requiring a session. Prefix match. */
const PROTECTED_PREFIXES = ["/admin", "/portal"] as const;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  // Presence only — deliberately no signature verification here. See above.
  const hasSessionCookie = Boolean(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  if (isProtected && !hasSessionCookie) {
    const loginUrl = new URL("/login", request.nextUrl);
    // No `?next=` parameter: reflecting a caller-supplied path into a
    // post-login redirect is how open redirects happen. Login routes by role.
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in and visiting /login — send them where they belong. Which
  // area is decided after the DAL resolves the real role; /admin redirects a
  // parent onward, so this is a safe default.
  if (pathname === "/login" && hasSessionCookie) {
    return NextResponse.redirect(new URL("/admin", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Only run on the paths that need it. Excluding static assets and image
   * optimization keeps this off the hot path for every CSS and font request.
   *
   * Note that Server Action POSTs to marketing routes (for example the enrollment
   * wizard on /enroll) are intentionally NOT matched — those actions do their own
   * authorization internally, and matching them here would buy nothing.
   */
  matcher: ["/admin/:path*", "/portal/:path*", "/login"],
};
