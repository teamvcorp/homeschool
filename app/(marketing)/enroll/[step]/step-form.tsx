"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { idleState, type ActionState } from "@/lib/actions/types";
import { cohorts, tuition } from "@/lib/site";
import {
  ESA_ELECTIONS,
  IMMUNIZATION_STATUSES,
  MEDIA_RELEASE_CHOICES,
} from "@/lib/db/enums";
import type { StepSlug } from "@/lib/validation/enrollment";
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
 * The wizard form body.
 *
 * A Client Component because it uses `useActionState` to render field-level errors
 * returned by the server action. The server action itself is passed in as a prop —
 * supported, and it keeps the action definition (and its imports) on the server.
 *
 * PROGRESSIVE ENHANCEMENT: this is a real <form action={…}>, so it submits and works
 * with JavaScript disabled. Only the inline error rendering and the pending button
 * state need JS.
 *
 * `defaults` are the values already saved in the draft, so navigating back to fix a
 * typo shows what was entered rather than an empty form.
 */

type Acknowledgment = { key: string; text: string };

export default function StepForm({
  slug,
  action,
  defaults,
  timestamp,
  acknowledgments,
  previousHref,
}: {
  slug: StepSlug;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults: Record<string, string>;
  timestamp: string;
  acknowledgments: Acknowledgment[];
  previousHref: Route | null;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const err = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="relative flex flex-col gap-6" noValidate>
      <AntiAbuseFields timestamp={timestamp} />
      <FormError message={!state.ok ? state.message : undefined} />

      {slug === "student" ? (
        <>
          <TextInput
            name="studentLegalName"
            label="Student's full legal name"
            required
            defaultValue={defaults.studentLegalName}
            error={err("studentLegalName")}
            autoComplete="off"
            hint="As it appears on their birth certificate or legal records."
          />
          <TextInput
            name="dateOfBirth"
            label="Date of birth"
            type="date"
            required
            defaultValue={defaults.dateOfBirth}
            error={err("dateOfBirth")}
          />
          <TextInput
            name="gradeLevel"
            label="Current or intended grade level"
            required
            defaultValue={defaults.gradeLevel}
            error={err("gradeLevel")}
            placeholder="e.g. Grade 5"
            hint="Your best estimate is fine — placement is confirmed at the intake meeting."
          />
          <Select
            name="requestedCohort"
            label="Which cohort seems right?"
            required
            defaultValue={defaults.requestedCohort}
            error={err("requestedCohort")}
            hint="Cohorts reflect readiness rather than age. The Head of School confirms placement."
            options={cohorts.map((c) => ({
              value: c.id,
              label: `${c.name} — ${c.range}`,
            }))}
          />
          <TextInput
            name="enrollmentStartDate"
            label="Intended start date"
            type="date"
            required
            defaultValue={defaults.enrollmentStartDate}
            error={err("enrollmentStartDate")}
          />
        </>
      ) : null}

      {slug === "guardian" ? (
        <>
          <TextInput
            name="guardianName"
            label="Parent / guardian name(s)"
            required
            defaultValue={defaults.guardianName}
            error={err("guardianName")}
            autoComplete="name"
          />
          <TextInput
            name="guardianAddress"
            label="Home address"
            required
            defaultValue={defaults.guardianAddress}
            error={err("guardianAddress")}
            autoComplete="street-address"
          />
          <TextInput
            name="guardianPhone"
            label="Primary phone"
            type="tel"
            required
            defaultValue={defaults.guardianPhone}
            error={err("guardianPhone")}
            autoComplete="tel"
          />
          <TextInput
            name="guardianEmail"
            label="Email address"
            type="email"
            required
            defaultValue={defaults.guardianEmail}
            error={err("guardianEmail")}
            autoComplete="email"
            hint="We send your confirmation and next steps here."
          />
          <TextInput
            name="emergencyContactName"
            label="Emergency contact (if different)"
            defaultValue={defaults.emergencyContactName}
            error={err("emergencyContactName")}
          />
          <TextInput
            name="emergencyContactPhone"
            label="Emergency contact phone"
            type="tel"
            defaultValue={defaults.emergencyContactPhone}
            error={err("emergencyContactPhone")}
          />
        </>
      ) : null}

      {slug === "funding" ? (
        <RadioGroup
          name="esaElection"
          legend="How will tuition be funded?"
          defaultValue={defaults.esaElection}
          error={err("esaElection")}
          hint="ESA applications are made directly through the Iowa Department of Education. We will provide any documentation your application needs."
          options={[
            {
              value: ESA_ELECTIONS[0],
              label: "We intend to apply for Iowa ESA funding",
              description: `Approximately $${tuition.esaEstimate.toLocaleString()} per student per year, paid by the State of Iowa.`,
            },
            {
              value: ESA_ELECTIONS[1],
              label: "We will pay the monthly contribution directly",
              description: `$${tuition.monthlyContribution} per student per month.`,
            },
            {
              value: ESA_ELECTIONS[2],
              label: "We are applying for financial hardship consideration",
              description:
                "The Head of School will discuss this with you privately. No student is turned away over money without a conversation first.",
            },
          ]}
        />
      ) : null}

      {slug === "medical" ? (
        <>
          <TextArea
            name="conditionsAndAllergies"
            label="Known medical conditions or allergies"
            defaultValue={defaults.conditionsAndAllergies}
            error={err("conditionsAndAllergies")}
            hint="Anything staff should know to keep your student safe. Leave blank if none."
          />
          <TextArea
            name="medications"
            label="Current medications"
            defaultValue={defaults.medications}
            error={err("medications")}
            rows={2}
          />
          <TextInput
            name="doctorName"
            label="Doctor or clinic name"
            defaultValue={defaults.doctorName}
            error={err("doctorName")}
          />
          <TextInput
            name="doctorPhone"
            label="Doctor or clinic phone"
            type="tel"
            defaultValue={defaults.doctorPhone}
            error={err("doctorPhone")}
          />
          <RadioGroup
            name="immunizationStatus"
            legend="Immunization documentation"
            defaultValue={defaults.immunizationStatus}
            error={err("immunizationStatus")}
            hint="Iowa law requires documentation of either immunization compliance or a valid exemption. Bring the paperwork to your intake meeting — nothing needs uploading here."
            options={[
              {
                value: IMMUNIZATION_STATUSES[0],
                label: "Immunization records are available",
              },
              {
                value: IMMUNIZATION_STATUSES[1],
                label: "A valid exemption is available",
              },
            ]}
          />
        </>
      ) : null}

      {slug === "acknowledgments" ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Program acknowledgments</legend>
          <p className="text-sm leading-relaxed text-ink-muted">
            All eight must be accepted. We would rather you read them and decide we are
            not the right school than sign and discover it in month two.
          </p>
          {acknowledgments.map((ack) => (
            <Checkbox
              key={ack.key}
              name={ack.key}
              label={ack.text}
              required
              defaultChecked={defaults[ack.key] === "true"}
              error={err(ack.key)}
            />
          ))}
        </fieldset>
      ) : null}

      {slug === "media" ? (
        <RadioGroup
          name="mediaRelease"
          legend="Photo and media release"
          defaultValue={defaults.mediaRelease}
          error={err("mediaRelease")}
          hint="There is no default and no wrong answer. Declining changes nothing about your student's participation."
          options={[
            {
              value: MEDIA_RELEASE_CHOICES[0],
              label:
                "I consent to photographs or video of my student being used for school promotional materials",
            },
            {
              value: MEDIA_RELEASE_CHOICES[1],
              label:
                "I do NOT consent to photographs or video of my student for any promotional use",
            },
          ]}
        />
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-4">
        <SubmitButton label="Save and continue" pendingLabel="Saving…" />
        {previousHref ? (
          <Link
            href={previousHref}
            className="text-sm font-medium text-navy-700 underline hover:text-navy-900"
          >
            Back
          </Link>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-ink-subtle">
        Your progress is saved as you go and is kept private. You can close this and
        come back on the same device.
      </p>
    </form>
  );
}
