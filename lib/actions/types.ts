import { z } from "zod";
import { reportError, messageFor, isNextControlFlow } from "../errors";

/**
 * SERVER ACTION RESULT CONTRACT
 * =============================================================================
 * One shape, used by every form in the app, so error rendering is written once.
 *
 * Designed for React 19's `useActionState`, whose action signature is
 * `(prevState, formData)` and which returns `[state, formAction, pending]`.
 */

export interface ActionState<T = undefined> {
  /** Discriminant. Narrow on this before reading `data` or the error fields. */
  ok: boolean;
  /**
   * Per-field messages, keyed by the input's `name` attribute so a field
   * component can look up its own error without prop threading.
   */
  fieldErrors?: Record<string, string[]>;
  /** Form-level message — announced in an aria-live region. */
  message?: string;
  /** Success payload. */
  data?: T;
}

/** Initial value for useActionState. */
export const idleState: ActionState = { ok: false };

export function success<T>(data?: T, message?: string): ActionState<T> {
  return { ok: true, data, message };
}

export function failure(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionState<never> {
  return { ok: false, message, fieldErrors };
}

/**
 * Converts a zod failure into an ActionState.
 *
 * NOTE THE ZOD VERSION: this project uses zod v4, where flattening moved to the
 * top-level `z.flattenError(error)`. The `error.flatten()` method shown in Next's
 * bundled forms guide is v3 and does not exist here.
 */
export function fromZodError(error: z.ZodError): ActionState<never> {
  const { fieldErrors, formErrors } = z.flattenError(error);
  return {
    ok: false,
    // Cast: zod types fieldErrors values as possibly-undefined per key, but every
    // key present in the object has at least one message.
    fieldErrors: fieldErrors as Record<string, string[]>,
    message:
      formErrors[0] ?? "Please correct the highlighted fields and try again.",
  };
}

/**
 * The message shown when something genuinely unexpected breaks.
 *
 * Deliberately generic. A raw error string can leak a connection string, a
 * collection name, or a stack path — and a visitor can do nothing useful with any
 * of it. Real detail goes to the server log.
 *
 * NOTE: `guardAction` no longer returns this bare string. It returns the same sentence with a
 * REFERENCE appended, so the visitor has something to quote on the phone. This constant
 * remains for callers that need a message without having an error in hand.
 */
export const GENERIC_ERROR =
  "Something went wrong on our end. Please try again, or call the school if it keeps happening.";

/**
 * Wraps an action body so unexpected throws become a clean ActionState instead of
 * a Next error overlay or an unhandled rejection.
 *
 * IMPORTANT: `redirect()` from next/navigation works by THROWING a control-flow
 * exception. Swallowing it here would silently break every redirect, so it is
 * detected and rethrown. Same for Next's notFound(). Call redirect() AFTER this
 * wrapper returns wherever possible.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY `name` IS REQUIRED
 *
 * This used to log `[action] unhandled error` with no indication of WHICH action failed.
 * Twelve actions share this wrapper, so that line told you a form broke somewhere. The name
 * is the log's primary grouping key and the first thing you need when a parent calls; making
 * it a required parameter is the only way to guarantee it is never omitted.
 *
 * The visitor-facing message now carries a reference that matches the log line — see
 * lib/errors.ts for why that reference is safe to display.
 */
export async function guardAction<T>(
  name: string,
  body: () => Promise<ActionState<T>>,
): Promise<ActionState<T>> {
  try {
    return await body();
  } catch (error) {
    // Next signals redirect/notFound via thrown objects carrying a digest string.
    // Rethrowing preserves that control flow.
    if (isNextControlFlow(error)) throw error;

    /**
     * Authorization failures are reported as a flat denial with no detail — and are still
     * REPORTED, because a burst of them is how an access-control problem or a probe shows up.
     */
    const report = reportError(error, { where: `action:${name}` });
    return { ok: false, message: messageFor(report) };
  }
}
