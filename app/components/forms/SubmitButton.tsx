"use client";

import { useFormStatus } from "react-dom";
// From lib/forms/fields, NOT lib/anti-abuse — the latter is `server-only` and
// importing it here would fail the build.
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from "@/lib/forms/fields";

/**
 * Submit button with pending state.
 *
 * The only Client Component in the form kit. `useFormStatus` comes from **react-dom**
 * (not react) and reads the state of the nearest enclosing <form>, so this needs no
 * props threaded from the parent.
 *
 * Disabling on pending is genuine protection, not just polish: without it a
 * double-clicked submit sends two requests. (The idempotency key on the application
 * is the real guarantee — this just avoids relying on it.)
 */
export function SubmitButton({
  label,
  pendingLabel,
  variant = "gold",
}: {
  label: string;
  pendingLabel?: string;
  variant?: "gold" | "primary";
}) {
  const { pending } = useFormStatus();

  const styles =
    variant === "gold"
      ? "bg-gold-400 text-navy-900 hover:bg-gold-300"
      : "bg-navy-800 text-white hover:bg-navy-700";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${styles}`}
    >
      {pending ? (pendingLabel ?? `${label}…`) : label}
      {!pending ? (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      ) : null}
    </button>
  );
}

/**
 * The two anti-abuse fields every public form carries.
 *
 * The honeypot is positioned OFF-SCREEN rather than `type="hidden"` or
 * `display:none` — some bots skip hidden inputs specifically, and some password
 * managers helpfully fill them. `tabIndex={-1}` plus `aria-hidden` keep it away from
 * keyboard and screen-reader users, so a real person never encounters it.
 *
 * `timestamp` is minted server-side (it is HMAC-signed) and passed in as a prop.
 */
export function AntiAbuseFields({ timestamp }: { timestamp: string }) {
  return (
    <>
      <input type="hidden" name={TIMESTAMP_FIELD} value={timestamp} />
      <div
        aria-hidden="true"
        // Inline style rather than a utility class: the intent is "park this far
        // off-screen", and expressing -9999px through Tailwind's spacing scale
        // produces a meaningless number.
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
      >
        <label htmlFor={HONEYPOT_FIELD}>Company website (leave this blank)</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
    </>
  );
}
