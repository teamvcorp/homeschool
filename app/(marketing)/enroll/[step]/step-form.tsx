"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { idleState, type ActionState } from "@/lib/actions/types";
import { cohorts, tuition } from "@/lib/site";
import { translator } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
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
// Purely presentational and free of server-only imports, so it is safe inside a Client
// Component.
import { Callout } from "@/app/components/ui/Callout";

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
  showCarryOverNotice = false,
  locale,
}: {
  slug: StepSlug;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults: Record<string, string>;
  timestamp: string;
  acknowledgments: Acknowledgment[];
  previousHref: Route | null;
  /** True when this step holds values carried over from a previous agreement. */
  showCarryOverNotice?: boolean;
  /**
   * Passed in rather than read here: this is a Client Component and cannot read the
   * language cookie. The step page resolves it server-side and hands it down.
   */
  locale: Locale;
}) {
  const tr = translator(locale);
  const [state, formAction] = useActionState(action, idleState);
  const err = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="relative flex flex-col gap-6" noValidate>
      <AntiAbuseFields timestamp={timestamp} />
      <FormError message={!state.ok ? state.message : undefined} />

      {/* Pre-filled values on a document about to be signed must be confirmed, not
          assumed — and saying so is also what tells a family the sibling carry-over
          worked. Without it, the flow lands on a step showing none of these fields and
          looks like it copied nothing. */}
      {showCarryOverNotice ? (
        <Callout title={tr("funnel.carryOver.title")}>
          {tr("funnel.carryOver.body")}
        </Callout>
      ) : null}

      {slug === "student" ? (
        <>
          <TextInput
            name="studentLegalName"
            label={tr("funnel.field.studentLegalName.label")}
            required
            defaultValue={defaults.studentLegalName}
            error={err("studentLegalName")}
            autoComplete="off"
            hint={tr("funnel.field.studentLegalName.hint")}
          />
          <TextInput
            name="dateOfBirth"
            label={tr("funnel.field.dateOfBirth.label")}
            type="date"
            required
            defaultValue={defaults.dateOfBirth}
            error={err("dateOfBirth")}
          />
          <TextInput
            name="gradeLevel"
            label={tr("funnel.field.gradeLevel.label")}
            required
            defaultValue={defaults.gradeLevel}
            error={err("gradeLevel")}
            placeholder={tr("funnel.field.gradeLevel.placeholder")}
            hint={tr("funnel.field.gradeLevel.hint")}
          />
          <Select
            name="requestedCohort"
            label={tr("funnel.field.requestedCohort.label")}
            required
            defaultValue={defaults.requestedCohort}
            error={err("requestedCohort")}
            hint={tr("funnel.field.requestedCohort.hint")}
            options={cohorts.map((c) => ({
              value: c.id,
              label: `${c.name} — ${c.range}`,
            }))}
          />
          <TextInput
            name="enrollmentStartDate"
            label={tr("funnel.field.enrollmentStartDate.label")}
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
            label={tr("funnel.field.guardianName.label")}
            required
            defaultValue={defaults.guardianName}
            error={err("guardianName")}
            autoComplete="name"
          />
          <TextInput
            name="guardianAddress"
            label={tr("funnel.field.guardianAddress.label")}
            required
            defaultValue={defaults.guardianAddress}
            error={err("guardianAddress")}
            autoComplete="street-address"
          />
          <TextInput
            name="guardianPhone"
            label={tr("funnel.field.guardianPhone.label")}
            type="tel"
            required
            defaultValue={defaults.guardianPhone}
            error={err("guardianPhone")}
            autoComplete="tel"
          />
          <TextInput
            name="guardianEmail"
            label={tr("funnel.field.guardianEmail.label")}
            type="email"
            required
            defaultValue={defaults.guardianEmail}
            error={err("guardianEmail")}
            autoComplete="email"
            hint={tr("funnel.field.guardianEmail.hint")}
          />
          <TextInput
            name="emergencyContactName"
            label={tr("funnel.field.emergencyContactName.label")}
            defaultValue={defaults.emergencyContactName}
            error={err("emergencyContactName")}
          />
          <TextInput
            name="emergencyContactPhone"
            label={tr("funnel.field.emergencyContactPhone.label")}
            type="tel"
            defaultValue={defaults.emergencyContactPhone}
            error={err("emergencyContactPhone")}
          />
        </>
      ) : null}

      {slug === "funding" ? (
        <RadioGroup
          name="esaElection"
          legend={tr("funnel.funding.legend")}
          defaultValue={defaults.esaElection}
          error={err("esaElection")}
          hint={tr("funnel.funding.hint")}
          options={[
            {
              value: ESA_ELECTIONS[0],
              label: tr("funnel.funding.esa.label"),
              description: tr("funnel.funding.esa.description", {
                esaEstimate: tuition.esaEstimate.toLocaleString(),
              }),
            },
            {
              value: ESA_ELECTIONS[1],
              label: tr("funnel.funding.direct.label"),
              description: tr("funnel.funding.direct.description", {
                monthlyContribution: tuition.monthlyContribution,
              }),
            },
            {
              value: ESA_ELECTIONS[2],
              label: tr("funnel.funding.hardship.label"),
              description: tr("funnel.funding.hardship.description"),
            },
          ]}
        />
      ) : null}

      {slug === "medical" ? (
        <>
          <TextArea
            name="conditionsAndAllergies"
            label={tr("funnel.field.conditionsAndAllergies.label")}
            defaultValue={defaults.conditionsAndAllergies}
            error={err("conditionsAndAllergies")}
            hint={tr("funnel.field.conditionsAndAllergies.hint")}
          />
          <TextArea
            name="medications"
            label={tr("funnel.field.medications.label")}
            defaultValue={defaults.medications}
            error={err("medications")}
            rows={2}
          />
          <TextInput
            name="doctorName"
            label={tr("funnel.field.doctorName.label")}
            defaultValue={defaults.doctorName}
            error={err("doctorName")}
          />
          <TextInput
            name="doctorPhone"
            label={tr("funnel.field.doctorPhone.label")}
            type="tel"
            defaultValue={defaults.doctorPhone}
            error={err("doctorPhone")}
          />
          <RadioGroup
            name="immunizationStatus"
            legend={tr("funnel.immunization.legend")}
            defaultValue={defaults.immunizationStatus}
            error={err("immunizationStatus")}
            hint={tr("funnel.immunization.hint")}
            options={[
              {
                value: IMMUNIZATION_STATUSES[0],
                label: tr("funnel.immunization.records"),
              },
              {
                value: IMMUNIZATION_STATUSES[1],
                label: tr("funnel.immunization.exemption"),
              },
            ]}
          />
        </>
      ) : null}

      {slug === "acknowledgments" ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">{tr("funnel.acknowledgments.legend")}</legend>
          <p className="text-sm leading-relaxed text-ink-muted">
            {tr("funnel.acknowledgments.intro")}
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
          legend={tr("funnel.media.legend")}
          defaultValue={defaults.mediaRelease}
          error={err("mediaRelease")}
          hint={tr("funnel.media.hint")}
          options={[
            {
              value: MEDIA_RELEASE_CHOICES[0],
              label: tr("funnel.media.consent"),
            },
            {
              value: MEDIA_RELEASE_CHOICES[1],
              label: tr("funnel.media.noConsent"),
            },
          ]}
        />
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-4">
        <SubmitButton label={tr("funnel.save")} pendingLabel={tr("funnel.saving")} />
        {previousHref ? (
          <Link
            href={previousHref}
            className="text-sm font-medium text-navy-700 underline hover:text-navy-900"
          >
            {tr("funnel.back")}
          </Link>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-ink-subtle">
        {tr("funnel.privacyNote")}
      </p>
    </form>
  );
}
