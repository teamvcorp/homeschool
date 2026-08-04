import { tuition, admissionsSteps } from "@/lib/site";
import { Section, SectionHeading } from "../ui/Section";
import { ButtonLink, ArrowIcon } from "../ui/Button";
import { ProcessSteps } from "../ui/ProcessSteps";
import { Callout } from "../ui/Callout";

/**
 * Tuition summary and the four-step admissions process (Document 4 §4.2–4.3).
 *
 * Iowa ESA is the headline here rather than a footnote: for most Iowa families it
 * is the difference between this school being affordable and being out of reach,
 * and burying it would waste the school's main accessibility story.
 */
export default function TuitionTeaser() {
  return (
    <Section id="tuition" tone="muted">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Cost */}
        <div>
          <SectionHeading
            eyebrow="Tuition &amp; Iowa ESA"
            title="What enrollment costs"
          />

          <div className="mt-8 flex flex-col gap-4">
            <div className="rounded-2xl border border-line bg-white p-6">
              <p className="font-serif text-4xl font-bold text-navy-900">
                ${tuition.monthlyContribution}
                <span className="ml-2 align-middle text-base font-medium text-ink-subtle">
                  per student / month
                </span>
              </p>
              <p className="mt-2 leading-relaxed text-ink-muted">
                {tuition.monthlyContributionNote}
              </p>
            </div>

            <div className="rounded-2xl border-l-4 border-gold-400 border-y border-r border-y-line border-r-line bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-gold-700">
                Iowa Education Savings Account
              </p>
              <p className="mt-2 font-serif text-2xl font-bold text-navy-900">
                {tuition.esaEstimateLabel}
              </p>
              <p className="mt-2 leading-relaxed text-ink-muted">
                {tuition.esaNote}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Callout>{tuition.hardshipNote}</Callout>
          </div>

          <ButtonLink href="/tuition" variant="outline" className="mt-6">
            Full tuition &amp; ESA details
            <ArrowIcon />
          </ButtonLink>
        </div>

        {/* Process */}
        <div>
          <SectionHeading eyebrow="Admissions" title="How to enroll" />
          <div className="mt-8">
            <ProcessSteps steps={admissionsSteps} />
          </div>
          <ButtonLink href="/enroll" variant="gold" className="mt-8">
            Start the application
            <ArrowIcon />
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
