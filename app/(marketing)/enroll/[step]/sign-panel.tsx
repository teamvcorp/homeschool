"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitEnrollmentAction } from "@/lib/actions/enrollment";
import { idleState } from "@/lib/actions/types";
import {
  ACKNOWLEDGMENT_LIST,
  AGREEMENT_PREAMBLE,
  SIGNATURE_ATTESTATION,
} from "@/lib/enrollment/agreement-text"; // text-only module — this is a Client Component
import { TextInput, Checkbox, FormError } from "@/app/components/forms/Field";
import { SubmitButton, AntiAbuseFields } from "@/app/components/forms/SubmitButton";

/**
 * The signature step.
 *
 * WHY TYPED NAME RATHER THAN A DRAWN SIGNATURE
 * Under the federal E-SIGN Act and Iowa UETA (Iowa Code ch. 554D), an electronic
 * signature is valid on demonstrable INTENT TO SIGN plus ATTRIBUTION to the signer.
 * Neither depends on the signature looking like handwriting. A canvas squiggle adds
 * image storage, an accessibility problem for anyone using a keyboard or screen
 * reader, and precisely zero legal weight.
 *
 * So the agreement text is displayed in full immediately above the signature (a
 * signer must be able to see what they are signing), intent is captured as its own
 * explicit affirmation, and the server records the evidence envelope: typed name,
 * timestamp, IP, user agent, consent version, and a SHA-256 hash of the exact
 * agreement text shown here.
 */
export default function SignPanel({ timestamp }: { timestamp: string }) {
  const [state, formAction] = useActionState(submitEnrollmentAction, idleState);
  const err = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="relative flex flex-col gap-6" noValidate>
      <AntiAbuseFields timestamp={timestamp} />
      <FormError message={!state.ok ? state.message : undefined} />

      {/* The agreement, restated in full. A signature is only meaningful if what it
          covers is visible at the moment of signing. */}
      <section className="rounded-2xl border border-line bg-surface-muted p-6">
        <h2 className="font-serif text-lg font-bold text-navy-900">
          What you are agreeing to
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {AGREEMENT_PREAMBLE}
        </p>
        <ol className="mt-4 flex list-decimal flex-col gap-2 pl-5">
          {ACKNOWLEDGMENT_LIST.map((ack) => (
            <li key={ack.key} className="text-sm leading-relaxed text-ink">
              {ack.text}
            </li>
          ))}
        </ol>
      </section>

      <TextInput
        name="typedName"
        label="Your full legal name"
        required
        error={err("typedName")}
        autoComplete="name"
        hint="Type your name exactly as you would write it. This is your signature."
      />

      <Checkbox
        name="intentAffirmed"
        required
        error={err("intentAffirmed")}
        label={SIGNATURE_ATTESTATION}
      />

      <div className="mt-2 flex flex-wrap items-center gap-4">
        <SubmitButton
          label="Sign and submit agreement"
          pendingLabel="Submitting…"
        />
        <Link
          href="/enroll/review"
          className="text-sm font-medium text-navy-700 underline hover:text-navy-900"
        >
          Back to review
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-ink-subtle">
        When you submit, we record the date and time, your device details, and a
        cryptographic fingerprint of this exact agreement text — so both you and the
        school have a durable record of precisely what was signed. You will receive a
        confirmation by email.
      </p>
    </form>
  );
}
