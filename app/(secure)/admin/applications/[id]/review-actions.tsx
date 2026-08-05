"use client";

import { useActionState } from "react";
import {
  transitionApplicationAction,
  countersignApplicationAction,
  promoteApplicationAction,
} from "@/lib/actions/applications";
import { idleState } from "@/lib/actions/types";
import { cohorts } from "@/lib/site";
import { TextInput, TextArea, Checkbox, Select, FormError } from "@/app/components/forms/Field";
import { SubmitButton } from "@/app/components/forms/SubmitButton";

/**
 * The three decisions an administrator makes on an application.
 *
 * Client Components purely for error rendering via `useActionState`. Each is a real
 * form posting a server action, so all three work with JavaScript disabled — and every
 * one re-authorizes server-side. The available-status list below is a UI convenience;
 * the legality of a transition is decided against the stored record in the action.
 */

function Banner({ state }: { state: { ok: boolean; message?: string } }) {
  if (!state.message) return null;
  return state.ok ? (
    <p
      role="status"
      className="rounded-lg border border-crest-green-100 bg-crest-green-50 px-4 py-2.5 text-sm font-medium text-crest-green-700"
    >
      {state.message}
    </p>
  ) : (
    <FormError message={state.message} />
  );
}

export function TransitionForm({
  applicationId,
  allowed,
  currentNotes,
}: {
  applicationId: string;
  allowed: readonly string[];
  currentNotes: string | null;
}) {
  const [state, formAction] = useActionState(transitionApplicationAction, idleState);

  if (allowed.length === 0) {
    return (
      <p className="text-sm text-ink-subtle">
        This application is in a final state and cannot be advanced further.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <Banner state={state} />

      <Select
        name="status"
        label="Move to"
        required
        error={state.fieldErrors?.status?.[0]}
        options={allowed.map((s) => ({ value: s, label: s }))}
      />

      <TextArea
        name="notes"
        label="Internal review notes"
        rows={3}
        defaultValue={currentNotes ?? ""}
        error={state.fieldErrors?.notes?.[0]}
        hint="Visible to staff only — never shown to the family."
      />

      <SubmitButton label="Update status" variant="primary" />
    </form>
  );
}

export function CountersignForm({ applicationId }: { applicationId: string }) {
  const [state, formAction] = useActionState(countersignApplicationAction, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <Banner state={state} />

      <TextInput
        name="typedName"
        label="Your full name"
        required
        error={state.fieldErrors?.typedName?.[0]}
        hint="This becomes the school's signature on the agreement."
      />

      <Checkbox
        name="intentAffirmed"
        required
        error={state.fieldErrors?.intentAffirmed?.[0]}
        label="I countersign this agreement on behalf of the school, intending my typed name to be my legal signature."
      />

      <SubmitButton label="Countersign agreement" variant="primary" />
    </form>
  );
}

export function PromoteForm({
  applicationId,
  suggestedCohort,
  suggestedGrade,
}: {
  applicationId: string;
  suggestedCohort: string | null;
  suggestedGrade: string;
}) {
  const [state, formAction] = useActionState(promoteApplicationAction, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <Banner state={state} />

      <p className="text-sm leading-relaxed text-ink-muted">
        Confirm placement. The family <em>requested</em> these values; what you set here
        is what the student record will hold.
      </p>

      <Select
        name="cohort"
        label="Cohort placement"
        required
        defaultValue={suggestedCohort ?? undefined}
        error={state.fieldErrors?.cohort?.[0]}
        options={cohorts.map((c) => ({
          value: c.id,
          label: `${c.name} — ${c.range}`,
        }))}
      />

      <TextInput
        name="gradeLevel"
        label="Grade level"
        required
        defaultValue={suggestedGrade}
        error={state.fieldErrors?.gradeLevel?.[0]}
      />

      <SubmitButton label="Create student record" />
    </form>
  );
}
