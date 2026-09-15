"use client";

import { useActionState } from "react";
import Link from "next/link";
import { idleState } from "@/lib/actions/types";
import { submitHomeschoolInterestAction } from "@/lib/actions/inquiry";
import { school, homeschoolAtHome } from "@/lib/site";
import {
  TextInput,
  TextArea,
  RadioGroup,
  Checkbox,
  Select,
  FormError,
} from "@/app/components/forms/Field";
import { SubmitButton, AntiAbuseFields } from "@/app/components/forms/SubmitButton";

/**
 * THE HOMESCHOOL AT HOME INTEREST FORM
 * =============================================================================
 * A Client Component because it uses `useActionState` to render field-level errors.
 *
 * PROGRESSIVE ENHANCEMENT: a real <form action={…}>, so it submits and works with
 * JavaScript disabled — only the inline errors and the pending button state need JS.
 * The tradeoff, stated plainly: with JS off, a browser reload re-POSTs and creates a
 * second inquiry. RATE_LIMITS.INQUIRY_PER_EMAIL (5/day) absorbs that, and a duplicate
 * sales lead is a trivial harm. If duplicates ever become a real annoyance, the fix is
 * POST-redirect-GET via `redirect("/homeschool?submitted=1")`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  WHAT THE LANGUAGE LENS CAN AND CANNOT TRANSLATE HERE — READ BEFORE EDITING COPY.
 *
 * The lens (app/components/LanguageLens.tsx) walks `p, li, h1–h6, dt, dd, blockquote,
 * figcaption, th, td, summary` and explicitly SKIPS anything inside
 * `a, button, input, select, textarea, label`. So on this form:
 *
 *   translated   → `hint` text (a <p>), and any <p> we render ourselves, above 25 chars
 *   NEVER        → labels, legends, <option> text, the submit button, and FormError
 *
 * Two consequences that shape the markup below:
 *
 *   1. PUT THE MEANING IN `hint`, NOT THE LABEL. Short label, full explanation in the
 *      hint — that way a Spanish- or Lao-reading family gets the explanation.
 *   2. THE ACKNOWLEDGMENT IS THE REAL PROBLEM. Asking a family to confirm they remain
 *      legally responsible for their own CPI reporting, in untranslatable English inside
 *      a <label>, is not acceptable. So `independenceStatement` is rendered as a <p>
 *      immediately above the checkbox, and the checkbox label itself stays short.
 *
 * Do NOT fix this by extending the lens's BLOCK_SELECTOR. That is a one-line change with
 * sitewide blast radius (most labels sit below the 25-char floor, and Checkbox's <label>
 * wraps an <input>, interacting with the interactive-element guard). It needs its own
 * verification pass, not a rider on this feature.
 */

const CHILD_COUNT_OPTIONS = [
  { value: "1", label: "1 child" },
  { value: "2", label: "2 children" },
  { value: "3", label: "3 children" },
  { value: "4", label: "4 children" },
  { value: "5", label: "5 children" },
  { value: "6", label: "6 children" },
  { value: "7", label: "7 children" },
  { value: "8", label: "8 children" },
  { value: "9", label: "9 or more" },
] as const;

const SITUATION_OPTIONS = [
  {
    value: "homeschoolingNow",
    label: "We homeschool now",
    description: "You are already teaching at home and want curriculum and support.",
  },
  {
    value: "consideringHomeschool",
    label: "We are considering homeschooling",
    description: "You have not started yet and want to know what it would take.",
  },
  {
    value: "leavingAnotherSchool",
    label: "We are leaving another school",
    description: "Your child is enrolled somewhere else and that is changing.",
  },
  { value: "other", label: "Something else", description: "Tell us below." },
] as const;

const TAEKWONDO_OPTIONS = [
  {
    value: "yes",
    label: "Yes — we would come to the dojo",
    description: "We will tell you honestly whether the drive and the class schedule work.",
  },
  {
    value: "maybe",
    label: "Maybe — tell us more",
    description: "We will explain what training looks like before you decide.",
  },
  {
    value: "no",
    label: "No — everything else only",
    description: "Everything else in the tier works the same from anywhere.",
  },
] as const;

export default function HomeschoolInterestForm({ timestamp }: { timestamp: string }) {
  const [state, formAction] = useActionState(
    submitHomeschoolInterestAction,
    idleState,
  );
  const err = (name: string) => state.fieldErrors?.[name]?.[0];

  /**
   * Success swaps the form out entirely.
   *
   * ⚠️  THIS PANEL MUST SAY WHAT HAPPENS NEXT, because nothing else will — the family
   * receives NO email (see lib/actions/inquiry.ts for why there is no confirmation to a
   * typed address). It must also never link app.vaschool.org: they have no account yet.
   */
  if (state.ok) {
    return (
      <div className="rounded-2xl border border-line border-l-4 border-l-gold-400 bg-white p-8">
        <h3 className="font-serif text-2xl font-bold text-navy-900">
          Thank you — we have your details
        </h3>
        <p className="mt-4 leading-relaxed text-ink-muted">
          The Head of School will call or email you within two school days to set up your
          account, arrange billing, and — if you told us Taekwondo is of interest — let you
          know honestly whether the drive and the class schedule work for your family.
        </p>
        <p className="mt-4 leading-relaxed text-ink-muted">
          You will not receive an automatic confirmation email, so nothing has gone wrong
          if your inbox stays quiet. If you would rather not wait, call the school on{" "}
          <a href={school.phoneHref} className="font-semibold text-navy-800 underline">
            {school.phone}
          </a>{" "}
          and we will take it from there.
        </p>
        <p className="mt-4 leading-relaxed text-ink-muted">
          In the meantime,{" "}
          <Link href="/admissions" className="font-semibold text-navy-800 underline">
            see how full enrollment works
          </Link>{" "}
          — most families who start here end up asking about it.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <AntiAbuseFields timestamp={timestamp} />
      <FormError message={!state.ok ? state.message : undefined} />

      <TextInput
        name="name"
        label="Your name"
        required
        autoComplete="name"
        error={err("name")}
        maxLength={120}
      />

      <TextInput
        name="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        hint="We will use this to reach you about setting up your account and billing."
        error={err("email")}
        maxLength={320}
      />

      <TextInput
        name="phone"
        label="Phone"
        type="tel"
        autoComplete="tel"
        hint="Optional, but it is usually the fastest way for us to answer your questions."
        error={err("phone")}
        maxLength={40}
      />

      <Select
        name="childCount"
        label="How many children"
        required
        options={CHILD_COUNT_OPTIONS}
        hint={`The fee is ${homeschoolAtHome.monthlyFeeLabel}, so this is what we would bill each month.`}
        error={err("childCount")}
      />

      <TextInput
        name="gradeLevels"
        label="Grades"
        required
        placeholder="K, 3rd, and 7th"
        hint="Roughly what grades your children are in. A phrase is enough — we are not looking for anything official."
        error={err("gradeLevels")}
        maxLength={200}
      />

      <TextInput
        name="nearestTown"
        label="Your town"
        required
        placeholder="Storm Lake"
        hint="We ask only so we can tell you honestly whether coming to the dojo for Taekwondo is realistic. Everything else in this tier works the same from anywhere."
        error={err("nearestTown")}
        maxLength={120}
      />

      <RadioGroup
        name="taekwondoInterest"
        legend="Taekwondo at the dojo"
        options={TAEKWONDO_OPTIONS}
        hint={homeschoolAtHome.inPersonTaekwondo.availability}
        error={err("taekwondoInterest")}
      />

      <RadioGroup
        name="currentSituation"
        legend="Where your family is right now"
        options={SITUATION_OPTIONS}
        error={err("currentSituation")}
      />

      <TextArea
        name="message"
        label="Anything else"
        rows={4}
        hint="Anything you would like us to know before we call — a subject that is not going well, a schedule constraint, a question about how this works."
        error={err("message")}
        maxLength={2000}
      />

      {/* ⚠️  The statement is a <p> so the Language Lens can translate it. The checkbox
          label below is deliberately short, because nothing inside a <label> translates.
          See the block comment at the top of this file. */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
        <p className="leading-relaxed text-ink-muted">
          {homeschoolAtHome.independenceStatement}
        </p>
        <Checkbox
          name="understandsIndependentStatus"
          label="I understand this is not enrollment."
          required
          error={err("understandsIndependentStatus")}
        />
      </div>

      <div>
        <SubmitButton label="Send this to the school" pendingLabel="Sending…" />
      </div>
    </form>
  );
}
