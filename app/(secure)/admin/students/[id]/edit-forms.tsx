"use client";

import { useActionState } from "react";
import {
  updateStudentAction,
  updateSchoolEmailAction,
} from "@/lib/actions/students";
import { idleState } from "@/lib/actions/types";
import {
  STUDENT_STATUSES,
  SCHOOL_EMAIL_STATUSES,
  IMMUNIZATION_STATUSES,
  MEDIA_RELEASE_CHOICES,
} from "@/lib/db/enums";
import { cohorts } from "@/lib/site";
import type { StudentDetail } from "@/lib/dto";
import {
  TextInput,
  TextArea,
  Select,
  RadioGroup,
  FormError,
} from "@/app/components/forms/Field";
import { SubmitButton } from "@/app/components/forms/SubmitButton";

/**
 * Student record editing.
 *
 * Client Components only so `useActionState` can render field errors; both are real forms
 * posting server actions, so they work with JavaScript disabled. Authorization — capability
 * plus student scope — is re-checked server-side on every submission, so the hidden
 * `studentId` here is untrusted input by design.
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

const IMMUNIZATION_LABELS: Record<string, string> = {
  recordsOnFile: "Immunization records on file",
  exemptionOnFile: "Valid exemption on file",
};

export function EditStudentForm({ student }: { student: StudentDetail }) {
  const [state, formAction] = useActionState(updateStudentAction, idleState);
  const err = (n: string) => state.fieldErrors?.[n]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="studentId" value={student.id} />
      <Result state={state} />

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-base font-bold text-navy-900">
          Student
        </legend>
        <TextInput
          name="legalName"
          label="Legal name"
          required
          defaultValue={student.legalName}
          error={err("legalName")}
          hint="Changing this does not change an already-issued school email."
        />
        <TextInput
          name="dateOfBirth"
          label="Date of birth"
          type="date"
          required
          defaultValue={student.dateOfBirth ?? ""}
          error={err("dateOfBirth")}
        />
        <TextInput
          name="gradeLevel"
          label="Grade level"
          required
          defaultValue={student.gradeLevel}
          error={err("gradeLevel")}
        />
        <Select
          name="cohort"
          label="Cohort"
          required
          defaultValue={student.cohort}
          error={err("cohort")}
          options={cohorts.map((c) => ({
            value: c.id,
            label: `${c.name} — ${c.range}`,
          }))}
        />
        <TextInput
          name="enrollmentStartDate"
          label="Enrollment start date"
          type="date"
          required
          defaultValue={student.enrollmentStartDate ?? ""}
          error={err("enrollmentStartDate")}
        />
        <Select
          name="status"
          label="Enrollment status"
          required
          defaultValue={student.status}
          error={err("status")}
          options={STUDENT_STATUSES.map((s) => ({ value: s, label: s }))}
        />
        <TextInput
          name="schoolId"
          label="School ID"
          defaultValue={student.schoolId ?? ""}
          error={err("schoolId")}
          hint="The school's own identifier, as used on paperwork and in K12/Stride. Must be unique."
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-line pt-5">
        <legend className="font-serif text-base font-bold text-navy-900">
          Parent / guardian
        </legend>
        <TextInput
          name="guardianName"
          label="Guardian name(s)"
          required
          defaultValue={student.guardian.name}
          error={err("guardianName")}
        />
        <TextInput
          name="guardianEmail"
          label="Guardian email"
          type="email"
          required
          defaultValue={student.guardian.email}
          error={err("guardianEmail")}
        />
        <TextInput
          name="guardianPhone"
          label="Guardian phone"
          type="tel"
          required
          defaultValue={student.guardian.phone}
          error={err("guardianPhone")}
        />
        <TextInput
          name="guardianAddress"
          label="Address"
          required
          defaultValue={student.guardian.address}
          error={err("guardianAddress")}
        />
        <TextInput
          name="emergencyContactName"
          label="Emergency contact"
          defaultValue={student.guardian.emergencyContactName ?? ""}
          error={err("emergencyContactName")}
        />
        <TextInput
          name="emergencyContactPhone"
          label="Emergency contact phone"
          type="tel"
          defaultValue={student.guardian.emergencyContactPhone ?? ""}
          error={err("emergencyContactPhone")}
        />
      </fieldset>

      {student.medical ? (
        <fieldset className="flex flex-col gap-4 border-t border-line pt-5">
          <legend className="font-serif text-base font-bold text-navy-900">
            Medical &amp; health
          </legend>
          <p className="text-xs text-ink-subtle">
            Confidential. Changes are audited.
          </p>
          <TextArea
            name="conditionsAndAllergies"
            label="Conditions / allergies"
            rows={2}
            defaultValue={student.medical.conditionsAndAllergies ?? ""}
            error={err("conditionsAndAllergies")}
          />
          <TextArea
            name="medications"
            label="Medications"
            rows={2}
            defaultValue={student.medical.medications ?? ""}
            error={err("medications")}
          />
          <TextInput
            name="doctorName"
            label="Doctor / clinic"
            defaultValue={student.medical.doctorName ?? ""}
            error={err("doctorName")}
          />
          <TextInput
            name="doctorPhone"
            label="Doctor phone"
            type="tel"
            defaultValue={student.medical.doctorPhone ?? ""}
            error={err("doctorPhone")}
          />
          <RadioGroup
            name="immunizationStatus"
            legend="Immunization documentation"
            defaultValue={student.medical.immunizationStatus}
            error={err("immunizationStatus")}
            options={IMMUNIZATION_STATUSES.map((s) => ({
              value: s,
              label: IMMUNIZATION_LABELS[s] ?? s,
            }))}
          />
        </fieldset>
      ) : null}

      <fieldset className="flex flex-col gap-4 border-t border-line pt-5">
        <legend className="font-serif text-base font-bold text-navy-900">
          Consents &amp; notes
        </legend>
        <RadioGroup
          name="mediaRelease"
          legend="Photo &amp; media release"
          defaultValue={student.mediaRelease}
          error={err("mediaRelease")}
          options={[
            { value: MEDIA_RELEASE_CHOICES[0], label: "Consent given" },
            {
              value: MEDIA_RELEASE_CHOICES[1],
              label: "Consent NOT given — do not use this student's image",
            },
          ]}
        />
        <TextArea
          name="notes"
          label="Internal notes"
          rows={3}
          defaultValue={""}
          error={err("notes")}
          hint="Staff only. Never shown to the family."
        />
      </fieldset>

      <div>
        <SubmitButton label="Save student record" variant="primary" />
      </div>
    </form>
  );
}

/**
 * School email management.
 *
 * Separate from the main record form on purpose: an email address is an identity in another
 * system (Office 365), and reissuing one is a different kind of decision from correcting a
 * misspelled surname. Keeping them apart means saving a typo fix cannot silently rewrite an
 * address that already has a live mailbox behind it.
 */
export function SchoolEmailForm({ student }: { student: StudentDetail }) {
  const [state, formAction] = useActionState(updateSchoolEmailAction, idleState);
  const err = (n: string) => state.fieldErrors?.[n]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="studentId" value={student.id} />
      <Result state={state} />

      <TextInput
        name="schoolEmail"
        label="School email address"
        type="email"
        defaultValue={student.schoolEmail ?? ""}
        error={err("schoolEmail")}
        hint="Leave blank and save to regenerate from the naming pattern: first name, day of birth, surname initial, 2-digit birth year."
      />

      <RadioGroup
        name="status"
        legend="Mailbox status"
        defaultValue={student.schoolEmailStatus ?? "pending"}
        error={err("status")}
        options={[
          {
            value: SCHOOL_EMAIL_STATUSES[0],
            label: "Pending",
            description:
              "Address is recorded but no Office 365 mailbox exists yet. Nothing will send mail to it.",
          },
          {
            value: SCHOOL_EMAIL_STATUSES[1],
            label: "Active",
            description: "Mailbox is live in Office 365 and deliverable.",
          },
          {
            value: SCHOOL_EMAIL_STATUSES[2],
            label: "Disabled",
            description: "Mailbox has been closed — e.g. the student has left.",
          },
        ]}
      />

      <div>
        <SubmitButton label="Save school email" variant="primary" />
      </div>
    </form>
  );
}
