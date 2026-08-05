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
 * Honeypot field name.
 *
 * ⚠️  DO NOT rename this to anything a browser's autofill engine might recognise.
 *
 * This field was originally named "company_website" and rendered as a TEXT INPUT with a
 * label reading "Company website". That combination broke enrollment in production:
 * Chrome and Edge address-autofill populated it whenever a family used autofill on the
 * guardian step (the step with a full address block), and the honeypot check then rejected
 * a real family's submission. Confirmed from production logs:
 *   [anti-abuse] honeypot filled on enroll-step
 *
 * Two things fixed it, and both matter:
 *  1. It is now a CHECKBOX, not a text input. Autofill engines fill text/select fields;
 *     they do not tick checkboxes. That removes the false-positive class entirely.
 *  2. The name is semantically meaningless. Autofill classifies fields by name, id, label,
 *     and placeholder — anything resembling "company", "website", "url", "email", "name",
 *     "address", or "phone" is a target. This one resembles nothing.
 *
 * `autocomplete="off"` is NOT sufficient protection on its own: Chrome has long ignored it
 * for address and payment heuristics.
 */
export const HONEYPOT_FIELD = "va_form_confirm_x9";

/** Signed timestamp proving when the form was served, for the timing check. */
export const TIMESTAMP_FIELD = "form_issued";
