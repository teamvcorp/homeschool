import type { Metadata } from "next";
import Link from "next/link";
import { school, admissionsSteps, tuition } from "@/lib/site";
import { PageHeader, Prose } from "@/app/components/ui/PageHeader";
import { Section, SectionHeading } from "@/app/components/ui/Section";
import { ProcessSteps } from "@/app/components/ui/ProcessSteps";
import { Callout } from "@/app/components/ui/Callout";
import { ExternalButtonLink, ArrowIcon } from "@/app/components/ui/Button";

/**
 * Enrollment entry point.
 *
 * INTERIM STATE: this page currently explains the process and routes families to
 * the Head of School directly. Phase 4 replaces the body of this route with the
 * multi-step Family Enrollment Agreement wizard (Document 9), backed by the
 * enrollmentDrafts collection and a signed httpOnly draft cookie.
 *
 * The "what you will need" list below is deliberately the field inventory of that
 * form, so it stays useful either way — and so families can gather medical and
 * guardian details before they start rather than abandoning the form to go find
 * a doctor's phone number.
 */
export const metadata: Metadata = {
  title: "Enroll",
  description: `Begin enrollment at The VA School. Four steps, ${tuition.monthlyContributionLabel}, with Iowa ESA funding accepted.`,
};

export default function EnrollPage() {
  return (
    <>
      <PageHeader
        eyebrow="Enrollment"
        title="Begin enrollment"
        lead="One agreement per student. Plan on about fifteen minutes once you have the details below to hand."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-3">
            <SectionHeading
              eyebrow="Start here"
              title="Contact the Head of School to open an application"
            />
            <Prose className="mt-6">
              <p>
                The online enrollment agreement is being finalized. In the
                meantime, enrollment opens the same way it always has &mdash; by
                talking to <strong>{school.headOfSchool}</strong> directly. Email
                or call, and you will get a real conversation rather than an
                automated reply.
              </p>
            </Prose>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ExternalButtonLink
                href={`mailto:${school.email}?subject=Enrollment%20application`}
                variant="gold"
                size="lg"
              >
                Email to enroll
                <ArrowIcon />
              </ExternalButtonLink>
              <ExternalButtonLink
                href={school.phoneHref}
                variant="outline"
                size="lg"
              >
                Call {school.phone}
              </ExternalButtonLink>
            </div>

            <div className="mt-12">
              <h2 className="font-serif text-xl font-bold text-navy-900">
                What happens after you reach out
              </h2>
              <div className="mt-6">
                <ProcessSteps steps={admissionsSteps} />
              </div>
            </div>
          </div>

          {/* Preparation checklist */}
          <aside className="lg:col-span-2">
            <div className="rounded-2xl border border-line bg-surface-muted p-7">
              <h2 className="font-serif text-lg font-bold text-navy-900">
                What you will need
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                The enrollment agreement asks for all of the following. Gathering
                it first makes the process quick.
              </p>

              <dl className="mt-6 flex flex-col gap-5 text-sm">
                {[
                  {
                    label: "Student",
                    items: [
                      "Legal name and date of birth",
                      "Current grade level",
                      "Intended enrollment start date",
                    ],
                  },
                  {
                    label: "Parent / guardian",
                    items: [
                      "Name(s), address, phone, email",
                      "An emergency contact and phone",
                    ],
                  },
                  {
                    label: "Funding",
                    items: [
                      "Whether you intend to apply for Iowa ESA funding, pay the monthly contribution directly, or request hardship consideration",
                    ],
                  },
                  {
                    label: "Medical",
                    items: [
                      "Known conditions or allergies",
                      "Current medications",
                      "Doctor or clinic name and phone",
                      "Immunization records — or a valid exemption",
                    ],
                  },
                  {
                    label: "Consents",
                    items: [
                      "Photo and media release decision",
                      "Acknowledgment of the handbook and behavioral framework",
                    ],
                  },
                ].map((group) => (
                  <div key={group.label}>
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-gold-700">
                      {group.label}
                    </dt>
                    <dd className="mt-1.5">
                      <ul className="flex list-disc flex-col gap-1 pl-4 leading-relaxed text-ink-muted">
                        {group.items.map((i) => (
                          <li key={i}>{i}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-6">
              <Callout title="Iowa immunization requirement" variant="statute">
                Iowa law requires documentation of either immunization compliance
                or a valid exemption for every enrolled student. You can bring
                either to the intake meeting &mdash; nothing needs to be uploaded
                or emailed.
              </Callout>
            </div>
          </aside>
        </div>
      </Section>

      <Section tone="muted" width="narrow">
        <SectionHeading
          eyebrow="Before you sign"
          title="Read what you will be agreeing to"
          lead="The enrollment agreement asks families to affirm eight specific commitments. None of them are boilerplate."
        />
        <Prose className="mt-6">
          <ul>
            <li>
              Students advance on <strong>demonstrated mastery</strong>, not by
              calendar year.
            </li>
            <li>
              Taekwondo is a <strong>core and required</strong> component of
              enrollment, not an elective.
            </li>
            <li>
              Graduation is earned through academic and character mastery, and is
              not conferred by age.
            </li>
            <li>
              Families maintain consistent attendance and communicate promptly
              about absences.
            </li>
            <li>
              Families accept the behavioral framework, including the Three
              Pillars of Pivotal Behavior.
            </li>
            <li>
              Families acknowledge the{" "}
              {tuition.monthlyContributionLabel.toLowerCase()} contribution and
              agree to timely payment.
            </li>
            <li>
              Families consent to participation in all regular school activities,
              including Taekwondo training.
            </li>
            <li>
              Families understand that records are kept confidentially and are
              accessible to them on request.
            </li>
          </ul>
          <p>
            All of this is spelled out in the{" "}
            <Link href="/handbook">Student &amp; Family Handbook</Link>. We would
            rather you read it now and decide we are not a fit than sign and
            discover it later.
          </p>
        </Prose>
      </Section>
    </>
  );
}
