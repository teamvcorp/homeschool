import { cohorts, categoryStyles } from "@/lib/site";
import { Section, SectionHeading } from "../ui/Section";
import { Card, CardTitle, CardBody, CardGrid } from "../ui/Card";

/**
 * The four cohort groups from Document 3 §3.2.
 *
 * Each cohort takes one of the crest's four quadrant hues — the mapping lives in
 * lib/site.ts, not here. Note the range is stated alongside the color, so the
 * grouping never depends on color perception alone.
 */
export default function Cohorts() {
  return (
    <Section id="cohorts" tone="muted">
      <SectionHeading
        eyebrow="How students are grouped"
        title="Four cohorts, placed by readiness"
        lead="Cohorts are not strictly age-based. A student is placed by their current academic and developmental stage, which is what makes individualized pacing possible in the first place."
      />

      <CardGrid columns={4} className="mt-12">
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
  );
}
