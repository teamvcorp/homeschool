"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetPasswordAction } from "@/lib/actions/password-reset";
import { idleState } from "@/lib/actions/types";

/**
 * Choose a new password, having arrived from an emailed link.
 *
 * ⚠️  THE `autoComplete` VALUES ARE FUNCTIONAL, NOT DECORATION. `new-password` on both
 * fields is what tells a password manager to offer to generate one and to save what is
 * typed. Get it wrong and someone sets a password their manager never records — and a
 * user who cannot retrieve the password they just set is locked out again, by the very
 * screen that exists to let them back in.
 *
 * There is no `current-password` field here, and that is the whole difference from
 * /account: the emailed token IS the authentication. Which is also why the action bumps
 * `sessionEpoch` and does not issue a session — see lib/actions/password-reset.ts.
 */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-navy-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Set my password"}
    </button>
  );
}

export default function ResetPasswordForm({
  token,
  minLength,
}: {
  token: string;
  minLength: number;
}) {
  const [state, formAction] = useActionState(resetPasswordAction, idleState);

  /**
   * On success the form is replaced. It must not be left on screen: the token has been
   * burned by this point, so a second submission would fail with "this link has expired"
   * and read as though the change had not worked.
   */
  if (state.ok && state.message) {
    return (
      <div className="flex flex-col gap-5">
        <h2 className="font-serif text-xl font-bold text-navy-900">
          Password changed
        </h2>
        <p role="status" aria-live="polite" className="text-sm leading-relaxed text-ink">
          {state.message}
        </p>
        <Link
          href="/login"
          className="rounded-full bg-navy-800 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-navy-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {/* The token rides the form rather than being re-read from the URL by the action:
          a server action is a POST to the current route and has no reliable access to
          the query string that rendered the page. */}
      <input type="hidden" name="token" value={token} />

      <div>
        <h2 className="font-serif text-xl font-bold text-navy-900">
          Choose a new password
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          At least {minLength} characters. A short phrase you can remember is stronger
          than a short password you cannot.
        </p>
      </div>

      {state.message && !state.ok ? (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-crest-red-100 bg-crest-red-50 px-4 py-3 text-sm text-crest-red-700"
        >
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-sm font-semibold text-navy-900">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={minLength}
          required
          autoFocus
          aria-invalid={state.fieldErrors?.newPassword ? true : undefined}
          aria-describedby={
            state.fieldErrors?.newPassword ? "newPassword-error" : undefined
          }
          className="rounded-lg border border-line-strong bg-white px-3 py-2.5 text-ink outline-none transition-colors focus:border-navy-600"
        />
        {state.fieldErrors?.newPassword ? (
          <p id="newPassword-error" className="text-sm text-crest-red-600">
            {state.fieldErrors.newPassword[0]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-semibold text-navy-900">
          Re-type the new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={minLength}
          required
          aria-invalid={state.fieldErrors?.confirmPassword ? true : undefined}
          aria-describedby={
            state.fieldErrors?.confirmPassword ? "confirmPassword-error" : undefined
          }
          className="rounded-lg border border-line-strong bg-white px-3 py-2.5 text-ink outline-none transition-colors focus:border-navy-600"
        />
        {state.fieldErrors?.confirmPassword ? (
          <p id="confirmPassword-error" className="text-sm text-crest-red-600">
            {state.fieldErrors.confirmPassword[0]}
          </p>
        ) : null}
      </div>

      <SubmitButton />
    </form>
  );
}
