"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/lib/actions/auth";
import { idleState } from "@/lib/actions/types";

/**
 * Sign-in form.
 *
 * React 19 wiring: `useActionState` gives the action a `(prevState, formData)`
 * signature and returns `[state, formAction, pending]`. `useFormStatus` (from
 * react-dom, not react) lets the submit button know it is submitting without the
 * parent passing anything down.
 *
 * Progressive enhancement: this is a real <form> with a real action, so it
 * submits and works with JavaScript disabled. The pending state is the only thing
 * that needs JS.
 */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-navy-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useActionState(loginAction, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div>
        <h2 className="font-serif text-xl font-bold text-navy-900">Sign in</h2>
        <p className="mt-1 text-sm text-ink-muted">
          For staff and enrolled families.
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-navy-900">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          aria-describedby={
            state.fieldErrors?.password ? "password-error" : undefined
          }
          className="rounded-lg border border-line-strong bg-white px-3 py-2.5 text-ink outline-none transition-colors focus:border-navy-600"
        />
        {state.fieldErrors?.password ? (
          <p id="password-error" className="text-sm text-crest-red-600">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
      </div>

      <SubmitButton />

      {/* Without this link the reset flow may as well not exist. Someone who cannot sign
          in is on THIS page, and they will not guess a URL. */}
      <Link
        href="/forgot-password"
        className="text-center text-sm font-semibold text-navy-700 underline hover:text-navy-900"
      >
        Forgot your password?
      </Link>
    </form>
  );
}
