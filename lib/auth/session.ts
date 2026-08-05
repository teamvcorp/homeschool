import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { env, isProduction } from "../env";
import type { Role } from "../db/enums";

/**
 * SESSIONS
 * =============================================================================
 * Stateless signed JWT in an httpOnly cookie, per the pattern in Next's own
 * authentication guide.
 *
 * The `epoch` claim is what makes a stateless token revocable: it mirrors
 * UserDoc.sessionEpoch, and the DAL rejects any token whose epoch no longer
 * matches the stored value. Bumping a user's sessionEpoch therefore invalidates
 * every outstanding session for them — used on password change, role change, and
 * deactivation. Without it, a stolen token would stay valid until expiry no
 * matter what an admin did.
 */

const COOKIE_NAME = "va_session";
const ALGORITHM = "HS256";

/** Eight hours: long enough for a school day, short enough to limit exposure. */
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

/**
 * The HMAC signing key, derived on first use and cached.
 *
 * Lazy, and deliberately so: computing it at module scope would read SESSION_SECRET
 * whenever anything imported this file, including `next build` collecting page data
 * for /admin — which fails a deployment when secrets are runtime-only configuration.
 */
let secretKeyCache: Uint8Array | null = null;

function getSecretKey(): Uint8Array {
  secretKeyCache ??= new TextEncoder().encode(env.SESSION_SECRET);
  return secretKeyCache;
}

export interface SessionPayload extends JWTPayload {
  userId: string;
  email: string;
  role: Role;
  /** Mirrors UserDoc.sessionEpoch. */
  epoch: number;
}

/** Signs a session token. Does not set the cookie — see `setSessionCookie`. */
export async function signSession(
  payload: Omit<SessionPayload, keyof JWTPayload>,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + SESSION_DURATION_SECONDS)
    .setIssuer("va-school")
    .setAudience("va-school")
    .sign(getSecretKey());
}

/**
 * Verifies a token's signature and claims.
 *
 * Returns null on ANY failure — expired, tampered, wrong issuer, malformed. A
 * caller must never be able to distinguish those cases, and must never receive a
 * partially-trusted payload.
 */
export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecretKey(), {
      algorithms: [ALGORITHM],
      issuer: "va-school",
      audience: "va-school",
    });
    // Defensive shape check: a valid signature only proves we minted it, not that
    // the claim set matches what today's code expects.
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.epoch !== "number"
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Writes the session cookie.
 *
 * ONLY callable from a Server Action or Route Handler — Next throws if a cookie is
 * set during a Server Component render.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    // Not secure in local dev, or the cookie would be dropped over plain HTTP.
    secure: isProduction,
    // 'lax' still sends the cookie on top-level navigation back to the site
    // (so an emailed link into the portal works) while blocking cross-site POSTs.
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Raw cookie value. Prefer the DAL's verifySession() over calling this. */
export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export { COOKIE_NAME as SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS };
