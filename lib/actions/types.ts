import { z } from "zod";

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
 */
export async function guardAction<T>(
  body: () => Promise<ActionState<T>>,
): Promise<ActionState<T>> {
  try {
    return await body();
  } catch (error) {
    // Next signals redirect/notFound via thrown objects carrying a digest string.
    // Rethrowing preserves that control flow.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
        (error as { digest: string }).digest === "NEXT_NOT_FOUND")
    ) {
      throw error;
    }

    // Authorization failures are reported as a flat denial with no detail.
    if (error instanceof Error && error.name === "AuthorizationError") {
      return { ok: false, message: "You do not have access to do that." };
    }

    console.error("[action] unhandled error", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}
