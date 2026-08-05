/**
 * SHARED FORM FIELD NAMES
 * =============================================================================
 * Deliberately its own module with NO `server-only` marker.
 *
 * The anti-abuse logic that validates these fields is server-only (it needs
 * FORM_HMAC_SECRET), but the *names* have to be known by the Client Component that
 * renders the inputs. Importing them from lib/anti-abuse.ts would drag `server-only`
 * into the client bundle and fail the build.
 *
 * Names only. No secrets, no logic.
 */

/**
 * Honeypot input name. Plausible-sounding so a form-filling bot completes it, while a
 * human never sees it (it is positioned off-screen — see the Honeypot component).
 */
export const HONEYPOT_FIELD = "company_website";

/** Signed timestamp proving when the form was served, for the timing check. */
export const TIMESTAMP_FIELD = "form_issued";
