"use client";

import { useActionState } from "react";
import {
  recordAttendanceAction,
  recordMasteryAction,
  recordBehaviorAction,
  recordTaekwondoRankAction,
} from "@/lib/actions/records";
import { idleState } from "@/lib/actions/types";
import {
  ATTENDANCE_CODES,
  SUBJECTS,
  ASSESSMENT_METHODS,
  BELT_RANKS,
  GENERALIZATION_LEVELS,
} from "@/lib/db/enums";
import { attendanceCodes, behaviorPillars } from "@/lib/site";
import {
  TextInput,
  TextArea,
  Select,
  RadioGroup,
  FormError,
} from "@/app/components/forms/Field";
import { SubmitButton } from "@/app/components/forms/SubmitButton";

/**
 * Record entry for Document 6, Templates A–D.
 *
 * Client Components solely for `useActionState` error rendering; every one is a real
 * form posting a server action, so they work without JavaScript. Authorization —
 * including whether this student is in the caller's scope — is re-checked server-side on
 * every submission. The `studentId` hidden field is untrusted input, which is exactly
 * why requireStudentAccess re-derives scope from the stored user record.
 */

function Result({ state }: { state: { ok: boolean; message?: string } }) {
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

/** Today as YYYY-MM-DD, for date-input defaults. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Current school year label, e.g. "2026–2027". Rolls over in July. */
function schoolYear(): string {
  const now = new Date();
  const start = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${start}–${start + 1}`;
}

/* ---------------------------- Template A ---------------------------------- */

export function AttendanceForm({ studentId }: { studentId: string }) {
  const [state, formAction] = useActionState(recordAttendanceAction, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="studentId" value={studentId} />
      <Result state={state} />

      <TextInput
        name="date"
        label="Date"
        type="date"
        required
        defaultValue={today()}
        error={state.fieldErrors?.date?.[0]}
        hint="School runs Monday through Thursday."
      />

      <RadioGroup
        name="code"
        legend="Attendance"
        error={state.fieldErrors?.code?.[0]}
        options={ATTENDANCE_CODES.map((code) => ({
          value: code,
          label: `${code} — ${attendanceCodes[code].label}`,
        }))}
      />

      <TextArea
        name="notes"
        label="Notes"
        rows={2}
        error={state.fieldErrors?.notes?.[0]}
      />

      <SubmitButton label="Record attendance" variant="primary" />
    </form>
  );
}

/* ---------------------------- Template B ---------------------------------- */

export function MasteryForm({ studentId }: { studentId: string }) {
  const [state, formAction] = useActionState(recordMasteryAction, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="schoolYear" value={schoolYear()} />
      <Result state={state} />

      <Select
        name="subject"
        label="Subject"
        required
        error={state.fieldErrors?.subject?.[0]}
        options={SUBJECTS.map((s) => ({ value: s, label: s }))}
      />

      <TextInput
        name="skill"
        label="Skill or unit mastered"
        required
        error={state.fieldErrors?.skill?.[0]}
        hint="Be specific — this is the record of what the student can actually do."
      />

      <TextInput
        name="dateMastered"
        label="Date mastered"
        type="date"
        required
        defaultValue={today()}
        error={state.fieldErrors?.dateMastered?.[0]}
      />

      <Select
        name="assessmentMethod"
        label="How was mastery demonstrated?"
        required
        error={state.fieldErrors?.assessmentMethod?.[0]}
        options={ASSESSMENT_METHODS.map((m) => ({ value: m, label: m }))}
      />

      <TextArea
        name="notes"
        label="Notes"
        rows={2}
        error={state.fieldErrors?.notes?.[0]}
        hint="If this was credited from a more complex demonstration, say which one."
      />

      <SubmitButton label="Record mastery" variant="primary" />
    </form>
  );
}

/* ---------------------------- Template C ---------------------------------- */

export function BehaviorForm({ studentId }: { studentId: string }) {
  const [state, formAction] = useActionState(recordBehaviorAction, idleState);

  // Every pillar's target behaviors, flattened, so the option list mirrors Template C.
  const targets = behaviorPillars.flatMap((p) =>
    p.targets.map((t) => ({ pillar: p.id, pillarName: p.name, target: t })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="studentId" value={studentId} />
      <Result state={state} />

      <TextInput
        name="period"
        label="Reporting period"
        required
        defaultValue={schoolYear()}
        error={state.fieldErrors?.period?.[0]}
        hint='e.g. "2026 Q3" or a term label.'
      />

      <Select
        name="pillar"
        label="Pivotal behavior pillar"
        required
        error={state.fieldErrors?.pillar?.[0]}
        options={behaviorPillars.map((p) => ({ value: p.id, label: p.name }))}
      />

      <Select
        name="targetBehavior"
        label="Target behavior"
        required
        error={state.fieldErrors?.targetBehavior?.[0]}
        options={targets.map((t) => ({
          value: t.target,
          label: `${t.target} (${t.pillarName})`,
        }))}
      />

      <RadioGroup
        name="level"
        legend="Generalization level"
        error={state.fieldErrors?.level?.[0]}
        options={GENERALIZATION_LEVELS.map((level) => ({
          value: String(level),
          label: `${level} — ${
            [
              "Skill not yet observed",
              "Emerging with significant support",
              "Developing with occasional support",
              "Independent in familiar contexts",
              "Generalized across environments",
            ][level - 1]
          }`,
        }))}
      />

      <TextArea
        name="notes"
        label="Notes / next steps"
        rows={3}
        error={state.fieldErrors?.notes?.[0]}
      />

      <SubmitButton label="Save behavioral record" variant="primary" />
    </form>
  );
}

/* ---------------------------- Template D ---------------------------------- */

export function TaekwondoForm({ studentId }: { studentId: string }) {
  const [state, formAction] = useActionState(recordTaekwondoRankAction, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="studentId" value={studentId} />
      <Result state={state} />

      <Select
        name="rank"
        label="Belt rank achieved"
        required
        error={state.fieldErrors?.rank?.[0]}
        options={BELT_RANKS.map((r) => ({ value: r, label: r }))}
      />

      <TextArea
        name="requirementsDemonstrated"
        label="Requirements demonstrated"
        required
        rows={3}
        error={state.fieldErrors?.requirementsDemonstrated?.[0]}
        hint="Technical skills, forms (poomsae), and embodiment of the five values."
      />

      <TextInput
        name="assessmentDate"
        label="Assessment date"
        type="date"
        required
        defaultValue={today()}
        error={state.fieldErrors?.assessmentDate?.[0]}
      />

      <TextInput
        name="assessedBy"
        label="Assessed by"
        required
        error={state.fieldErrors?.assessedBy?.[0]}
        hint="May be an external examiner."
      />

      <SubmitButton label="Record rank" variant="primary" />
    </form>
  );
}
