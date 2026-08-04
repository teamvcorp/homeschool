import type { Metadata } from "next";
import {
  wholePartWhole,
  cohorts,
  coreSubjects,
  enrichmentSubjects,
  curriculumResources,
  masteryAssessment,
  categoryStyles,
} from "@/lib/site";
import { PageHeader, Prose } from "@/app/components/ui/PageHeader";
import { Section, SectionHeading } from "@/app/components/ui/Section";
import { CycleSteps } from "@/app/components/ui/ProcessSteps";
import { DataTable } from "@/app/components/ui/Table";
import { Callout } from "@/app/components/ui/Callout";
import { Card, CardTitle, CardBody, CardGrid } from "@/app/components/ui/Card";
import { CTABand } from "@/app/components/ui/CTABand";

/** Source: accreditation package Document 3 — Curriculum Framework & Scope of Instruction. */
export const metadata: Metadata = {
  title: "Curriculum & Instruction",
  description:
    "The Whole-Part-Whole instructional cycle, four cohort groups, full K–12 subject scope, and the mastery-based assessment framework used at The VA School.",
};

export default function CurriculumPage() {
  return (
    <>
      <PageHeader
        eyebrow="Curriculum &amp; instruction"
        title="How instruction actually works"
        lead="Every subject runs on the same repeating cycle: teach the high-level concept to everyone, then work with each student individually at their real level, then reconvene and demonstrate. Roughly every hour."
      />

      {/* Whole-Part-Whole */}
      <Section>
        <SectionHeading
          eyebrow="Instructional model"
          title="The Whole&ndash;Part&ndash;Whole cycle"
          lead="This is the mechanism that lets one classroom hold a first-grader and an eleventh-grader without shortchanging either. Nobody is held back to the group's pace, and nobody is left behind by it."
        />
        <div className="mt-10 max-w-4xl">
          <CycleSteps phases={wholePartWhole} />
        </div>

        <div className="mt-10 max-w-3xl">
          <Callout title="Why the group phase matters" variant="statute">
            No concept is withheld from younger or earlier-stage students. A
            second-grader sits in on the high-level introduction alongside a
            senior. The point is not that they will master it today &mdash; it is
            that the ceiling stays visible, and curiosity runs forward instead of
            being rationed.
          </Callout>
        </div>
      </Section>

      {/* Cohorts */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="Cohort structure"
          title="Four groups, placed by readiness rather than birthday"
        />
        <CardGrid columns={4} className="mt-10">
          {cohorts.map((cohort) => (
            <Card key={cohort.id} as="li" accent={cohort.color}>
              <p
                className={`text-xs font-bold uppercase tracking-[0.12em] ${
                  categoryStyles[cohort.color].text
                }`}
              >
                {cohort.range}
              </p>
              <CardTitle>{cohort.name}</CardTitle>
              <CardBody>{cohort.focus}</CardBody>
            </Card>
          ))}
        </CardGrid>
      </Section>

      {/* Subject scope */}
      <Section>
        <SectionHeading
          eyebrow="Scope of instruction"
          title="What is taught"
          lead="All subject areas required for a comprehensive K–12 education, delivered to the highest level each student can reach."
        />

        <h3 className="mt-10 font-serif text-xl font-bold text-navy-900">
          Core academic subjects
        </h3>
        <div className="mt-4">
          <DataTable
            caption="Core academic subjects and their scope"
            headers={["Subject", "Scope"]}
            rowHeaders
            rows={coreSubjects.map((s) => [s.name, s.scope])}
          />
        </div>

        <h3 className="mt-12 font-serif text-xl font-bold text-navy-900">
          Enrichment &amp; applied subjects
        </h3>
        <p className="mt-2 max-w-3xl leading-relaxed text-ink-muted">
          Required and assessed, not offered at the margins.
        </p>
        <div className="mt-4">
          <DataTable
            caption="Enrichment and applied subjects and their scope"
            headers={["Subject", "Scope"]}
            rowHeaders
            rows={enrichmentSubjects.map((s) => [s.name, s.scope])}
          />
        </div>
      </Section>

      {/* Resources */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="Curriculum resources"
          title="What we teach from"
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {curriculumResources.map((r) => (
            <div
              key={r.name}
              className="rounded-2xl border border-line bg-white p-6"
            >
              <h3 className="font-serif text-lg font-bold text-navy-900">
                {r.name}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-muted">{r.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Assessment */}
      <Section>
        <SectionHeading
          eyebrow="Assessment"
          title="We do not lead with letter grades"
          lead="A letter grade compresses a semester of uneven progress into one character. Mastery records say what a student can actually do, and when they proved it."
        />

        <div className="mt-8 max-w-3xl">
          <Prose>
            <ul>
              {masteryAssessment.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Prose>
        </div>

        <div className="mt-10 max-w-3xl">
          <Callout title="Hierarchical competency assessment" variant="statute">
            If a student demonstrates a complex skill, we accept that as proof of
            the simpler skills inside it rather than making them prove each one
            separately. A student who can solve a multi-step algebra problem has
            already shown you they can do the arithmetic. Re-testing it wastes
            their time and teaches them that school is theater.
          </Callout>
        </div>
      </Section>

      <CTABand />
    </>
  );
}
