"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { changePasswordAction } from "@/lib/actions/account";
import { idleState } from "@/lib/actions/types";

/**
 * Change-password form.
 *
 * Mirrors login-form.tsx: a real <form> with a real action, so it works with JavaScript
 * disabled; `useFormStatus` supplies the pending state, which is the only part that needs JS.
 *
 * ⚠️  THE `autoComplete` VALUES ARE FUNCTIONAL, NOT DECORATION.
 *
 * `current-password` on the first field and `new-password` on the other two is what tells a
 * password manager to offer the saved credential for one and to generate-and-save for the
 * others. Get them wrong and the manager overwrites the stored password with whatever is in
 * the current-password box, or fails to save the new one at all — and a user who cannot
 * retrieve the password they just set is locked out of the student records system.
 */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-navy-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Changing…" : "Change password"}
    </button>
  );
}

/**
 * `minLength` arrives as a PROP rather than being imported.
 *
 * lib/auth/password.ts is marked `server-only` — it holds the Argon2id hashing. Importing
 * the constant from here pulled that whole module into the client bundle and failed the
 * build. Threading it from the server page keeps one source of truth without shipping any
 * of the hashing code (or its reasons) to the browser.
 */
export default function ChangePasswordForm({ minLength }: { minLength: number }) {
  const [state, formAction] = useActionState(changePasswordAction, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {/* aria-live so a screen reader announces the outcome on arrival rather than
          leaving the user to discover it by re-reading the page. */}
      {state.message ? (
        <div
          role="alert"
          aria-live="polite"
          className={
            state.ok
              ? "rounded-lg border border-line bg-surface-muted px-4 py-3 text-sm text-ink"
              : "rounded-lg border border-crest-red-100 bg-crest-red-50 px-4 py-3 text-sm text-crest-red-700"
          }
        >
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="currentPassword" className="text-sm font-semibold text-navy-900">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.fieldErrors?.currentPassword ? true : undefined}
          aria-describedby={
            state.fieldErrors?.currentPassword ? "currentPassword-error" : undefined
          }
          className="rounded-lg border border-line-strong bg-white px-3 py-2.5 text-ink outline-none transition-colors focus:border-navy-600"
        />
        {state.fieldErrors?.currentPassword ? (
          <p id="currentPassword-error" className="text-sm text-crest-red-600">
            {state.fieldErrors.currentPassword[0]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-sm font-semibold text-navy-900">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={minLength}
          aria-invalid={state.fieldErrors?.newPassword ? true : undefined}
          aria-describedby="newPassword-hint"
          className="rounded-lg border border-line-strong bg-white px-3 py-2.5 text-ink outline-none transition-colors focus:border-navy-600"
        />
        <p id="newPassword-hint" className="text-sm text-ink-muted">
          At least {minLength} characters. A short phrase you can remember beats a
          short password you cannot.
        </p>
        {state.fieldErrors?.newPassword ? (
          <p className="text-sm text-crest-red-600">{state.fieldErrors.newPassword[0]}</p>
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

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
