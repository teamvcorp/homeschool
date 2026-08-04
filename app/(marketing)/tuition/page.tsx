import type { Metadata } from "next";
import Link from "next/link";
import { school, tuition } from "@/lib/site";
import { PageHeader, Prose } from "@/app/components/ui/PageHeader";
import { Section, SectionHeading } from "@/app/components/ui/Section";
import { DataTable } from "@/app/components/ui/Table";
import { Callout } from "@/app/components/ui/Callout";
import { ExternalButtonLink } from "@/app/components/ui/Button";
import { CTABand } from "@/app/components/ui/CTABand";

/** Source: accreditation package Document 4 §4.3 — Tuition & Fees. */
export const metadata: Metadata = {
  title: "Tuition & Iowa ESA",
  description: `${tuition.monthlyContributionLabel} family contribution, with Iowa Education Savings Account funding of approximately $${tuition.esaEstimate.toLocaleString()} per student per year. Financial hardship consideration available.`,
};

export default function TuitionPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tuition &amp; Iowa ESA"
        title="What enrollment costs"
        lead="For most Iowa families, Iowa's Education Savings Account program is the difference between this school being affordable and being out of reach. Here is exactly how the numbers work."
      />

      {/* Headline numbers */}
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-8">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
              Monthly family contribution
            </p>
            <p className="mt-3 font-serif text-5xl font-bold text-navy-900">
              ${tuition.monthlyContribution}
              <span className="ml-2 align-middle text-base font-medium text-ink-subtle">
                per student / month
              </span>
            </p>
            <p className="mt-4 leading-relaxed text-ink-muted">
              {tuition.monthlyContributionNote}
            </p>
          </div>

          <div className="rounded-2xl border border-line border-l-4 border-l-gold-400 bg-white p-8">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gold-700">
              Iowa Education Savings Account
            </p>
            <p className="mt-3 font-serif text-5xl font-bold text-navy-900">
              ~${tuition.esaEstimate.toLocaleString()}
              <span className="ml-2 align-middle text-base font-medium text-ink-subtle">
                per student / year
              </span>
            </p>
            <p className="mt-4 leading-relaxed text-ink-muted">
              {tuition.esaNote}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <DataTable
            caption="Complete tuition and fee schedule"
            headers={["Fee type", "Amount", "Notes"]}
            rowHeaders
            rows={[
              [
                "Monthly family contribution",
                tuition.monthlyContributionLabel,
                tuition.monthlyContributionNote,
              ],
              ["Iowa ESA tuition", tuition.esaEstimateLabel, tuition.esaNote],
              [
                "Financial hardship consideration",
                "Available on request",
                "Contact the Head of School to discuss individually. We would rather have a conversation than lose a student over money.",
              ],
            ]}
          />
        </div>
      </Section>

      {/* ESA explainer */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="Iowa school choice"
          title="How the ESA program works"
          lead="Iowa's Education Savings Account program directs per-pupil state funding to the school a family actually chooses."
        />

        <div className="mt-8 max-w-3xl">
          <Prose>
            <h3>The short version</h3>
            <p>
              Iowa families may apply for an Education Savings Account that covers
              tuition at an accredited nonpublic school. The funds are paid toward
              the school your student attends, rather than to the district they
              would otherwise have been assigned to.
            </p>

            <h3>What you do</h3>
            <ul>
              <li>
                Apply for the ESA <strong>directly through the Iowa Department
                of Education</strong> — the school cannot apply on your behalf.
              </li>
              <li>
                Indicate your ESA intention on your enrollment application so we
                know to expect it.
              </li>
              <li>
                Request any documentation you need from us. We will provide
                whatever the application requires.
              </li>
            </ul>

            <h3>What we are doing</h3>
            <p>
              ESA funding requires that the receiving school be accredited. The VA
              School is pursuing Iowa Department of Education accreditation for
              exactly this reason &mdash; so that families choosing us are not
              penalized financially for it. Our full accreditation submission is{" "}
              <Link href="/accreditation">published openly</Link>.
            </p>
          </Prose>
        </div>

        <div className="mt-10 max-w-3xl">
          <Callout title="An honest caveat" variant="statute">
            The ~${tuition.esaEstimate.toLocaleString()} figure is a current
            estimate, and ESA award amounts are set by the State of Iowa rather
            than by us. Confirm current amounts and eligibility with the Iowa
            Department of Education before treating any figure here as final.
          </Callout>
        </div>
      </Section>

      {/* Hardship */}
      <Section>
        <div className="max-w-3xl">
          <SectionHeading
            eyebrow="Financial hardship"
            title="If the contribution is a barrier, say so"
            lead={tuition.hardshipNote}
          />
          <Prose className="mt-6">
            <p>
              This is a 501(c)(3) nonprofit, not a business optimizing tuition
              revenue. If the monthly contribution is what stands between your
              student and this school, tell us during the intake meeting or before
              it. There is a conversation to be had, and it is a private one.
            </p>
          </Prose>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ExternalButtonLink
              href={`mailto:${school.email}?subject=Financial%20hardship%20consideration`}
              variant="primary"
            >
              Email the Head of School
            </ExternalButtonLink>
            <ExternalButtonLink href={school.phoneHref} variant="outline">
              {school.phone}
            </ExternalButtonLink>
          </div>
        </div>
      </Section>

      <CTABand
        title="Ready to start?"
        lead="Your enrollment application includes the ESA election — you can indicate your funding intention as you go."
      />
    </>
  );
}
