"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";
import { idleState } from "@/lib/actions/types";

/**
 * Request a password-reset link.
 *
 * Mirrors login-form.tsx: a real <form> with a real action, so it works with JavaScript
 * disabled; `useFormStatus` supplies the pending state, which is the only part needing JS.
 *
 * ⚠️  THE SUCCESS STATE IS DELIBERATELY NON-COMMITTAL, and the UI must keep it that way.
 *
 * `state.ok` here does NOT mean "we sent an email" — it means "we finished processing".
 * The action returns the identical response for a known address, an unknown one, a
 * deactivated account, and a rate-limited caller, because anything else would let a
 * stranger confirm which families have accounts at this school. Do not add a "check
 * your inbox at bob@example.com" flourish, do not vary the wording, and do not surface
 * a different state when nothing was sent. See lib/actions/password-reset.ts.
 */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-navy-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending…" : "Email me a reset link"}
    </button>
  );
}

export default function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, idleState);

  /**
   * On success the form is replaced entirely rather than left on screen.
   *
   * Leaving it would invite a second submission, which costs one of only three per hour
   * for that address and would teach people to burn their own limit while waiting for
   * mail that is already on its way.
   */
  if (state.ok && state.message) {
    return (
      <div className="flex flex-col gap-5">
        <h2 className="font-serif text-xl font-bold text-navy-900">Check your email</h2>
        <p role="status" aria-live="polite" className="text-sm leading-relaxed text-ink">
          {state.message}
        </p>
        <Link
          href="/login"
          className="text-sm font-semibold text-navy-700 underline hover:text-navy-900"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div>
        <h2 className="font-serif text-xl font-bold text-navy-900">
          Reset your password
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Enter the email address you sign in with and we will send you a link to choose
          a new password.
        </p>
      </div>

      {/* Form-level error. aria-live so a screen reader announces it on arrival
          rather than leaving the user to discover it by re-reading the page. */}
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
        <label htmlFor="email" className="text-sm font-semibold text-navy-900">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          className="rounded-lg border border-line-strong bg-white px-3 py-2.5 text-ink outline-none transition-colors focus:border-navy-600"
        />
        {state.fieldErrors?.email ? (
          <p id="email-error" className="text-sm text-crest-red-600">
            {state.fieldErrors.email[0]}
          </p>
        ) : null}
      </div>

      <SubmitButton />

      <Link
        href="/login"
        className="text-center text-sm font-semibold text-navy-700 underline hover:text-navy-900"
      >
        Back to sign in
      </Link>
    </form>
  );
}
