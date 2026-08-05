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
 * ⚠️  THE HONEYPOT IS A CHECKBOX ON PURPOSE. DO NOT MAKE IT A TEXT INPUT.
 *
 * The first version of this component rendered an off-screen TEXT INPUT named
 * "company_website" with a matching label. That broke enrollment for real families in
 * production: Chrome and Edge address-autofill filled it on the guardian step, the
 * honeypot check saw a value, and a genuine submission was rejected with a generic
 * "we could not process that" error. Production log confirming it:
 *   [anti-abuse] honeypot filled on enroll-step
 *
 * Browser autofill fills text and select fields. It does NOT tick checkboxes. A checkbox
 * trap therefore keeps the anti-bot value while making a false positive from autofill
 * essentially impossible — an unchecked checkbox submits no value at all.
 *
 * Note that `left: -9999px` was never the problem and is not the fix; off-screen fields
 * are still very much visible to autofill. The input TYPE is what matters.
 *
 * `timestamp` is minted server-side (it is HMAC-signed) and passed in as a prop.
 */
export function AntiAbuseFields({ timestamp }: { timestamp: string }) {
  return (
    <>
      <input type="hidden" name={TIMESTAMP_FIELD} value={timestamp} />
      <div
        aria-hidden="true"
        // Parked off-screen rather than display:none, because some bots skip
        // display:none fields. Combined with tabIndex={-1} and aria-hidden, no keyboard
        // or screen-reader user can reach it.
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        {/* Label text is deliberately generic — nothing an autofill heuristic classifies. */}
        <label htmlFor={HONEYPOT_FIELD}>Leave this unchecked</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="checkbox"
          value="1"
          tabIndex={-1}
          autoComplete="off"
          defaultChecked={false}
        />
      </div>
    </>
  );
}
