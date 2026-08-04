import type { Metadata } from "next";
import Link from "next/link";
import {
  school,
  admissionsSteps,
  nonDiscrimination,
  tuition,
  attendancePolicy,
  behaviorPillars,
  behaviorResponseSteps,
  taekwondoRequirements,
  graduationPathways,
} from "@/lib/site";
import { PageHeader, Prose } from "@/app/components/ui/PageHeader";
import { Section, SectionHeading } from "@/app/components/ui/Section";
import { ProcessSteps } from "@/app/components/ui/ProcessSteps";
import { DataTable } from "@/app/components/ui/Table";
import { Callout } from "@/app/components/ui/Callout";
import { CTABand } from "@/app/components/ui/CTABand";

/** Source: accreditation package Document 4 — Student & Family Handbook. */
export const metadata: Metadata = {
  title: "Student & Family Handbook",
  description:
    "Enrollment, attendance, the Three Pillars behavioral framework, Taekwondo requirements, and graduation standards at The VA School.",
};

export default function HandbookPage() {
  return (
    <>
      <PageHeader
        eyebrow="Student &amp; family handbook"
        title="Policies, expectations, and how we handle hard days"
        lead="This handbook governs enrollment, attendance, conduct, and progression. By enrolling, families affirm agreement with everything in it — so it is worth reading before you apply, not after."
      />

      {/* Admissions */}
      <Section id="admissions">
        <SectionHeading eyebrow="Section 1" title="Enrollment &amp; admissions" />

        <Prose className="mt-6">
          <h3>Who we serve</h3>
          <p>
            The VA School accepts students in grades Kindergarten through 12, and
            eligible graduates into The VA Higher Institute. The school is designed
            to serve students at{" "}
            <strong>all academic and behavioral starting points</strong>.
          </p>
          <p>
            No student is turned away because of academic gaps, behavioral
            history, or prior school difficulty. Those are exactly the students
            this model was built for.
          </p>
        </Prose>

        <div className="mt-10 max-w-3xl">
          <h3 className="font-serif text-lg font-bold text-navy-900">
            The admissions process
          </h3>
          <div className="mt-4">
            <ProcessSteps steps={admissionsSteps} />
          </div>
        </div>

        <div className="mt-10 max-w-3xl">
          <Callout title="Non-discrimination policy">
            {nonDiscrimination}
          </Callout>
        </div>
      </Section>

      {/* Tuition */}
      <Section id="tuition" tone="muted">
        <SectionHeading eyebrow="Section 2" title="Tuition &amp; fees" />
        <div className="mt-8">
          <DataTable
            caption="Tuition and fee schedule"
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
                "Financial hardship",
                "Available on request",
                "Contact the Head of School to discuss individually.",
              ],
            ]}
          />
        </div>
        <p className="mt-6 text-sm leading-relaxed text-ink-subtle">
          Full details, including how Iowa ESA funding works, are on the{" "}
          <Link
            href="/tuition"
            className="font-medium text-navy-700 underline hover:text-navy-900"
          >
            tuition page
          </Link>
          .
        </p>
      </Section>

      {/* Calendar & attendance */}
      <Section id="attendance">
        <SectionHeading
          eyebrow="Section 3"
          title="Calendar &amp; attendance"
          lead="Because each student's progression is tracked individually, an absence creates a specific gap in a specific skill sequence — which has to be resolved before advancement."
        />

        <Prose className="mt-6">
          <h3>Schedule</h3>
          <ul>
            <li>
              <strong>Instructional days:</strong> Monday through Thursday, a
              four-day week
            </li>
            <li>
              <strong>Calendar:</strong> Year-round, with scheduled breaks
            </li>
            <li>
              <strong>Closures:</strong> The school follows{" "}
              {school.address.county} weather emergency protocols
            </li>
          </ul>

          <h3>Attendance policy</h3>
          <ul>
            {attendancePolicy.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Prose>

        <div className="mt-8 max-w-3xl">
          <Callout title="Daily hours &amp; break schedule">
            Current daily hours and the published break schedule are provided at
            the intake meeting and on request &mdash;{" "}
            <a href={`mailto:${school.email}`}>{school.email}</a> or{" "}
            <a href={school.phoneHref}>{school.phone}</a>.
          </Callout>
        </div>
      </Section>

      {/* Behavior */}
      <Section id="behavior" tone="muted">
        <SectionHeading
          eyebrow="Section 4"
          title="Behavioral framework &mdash; the Three Pillars"
          lead="Grounded in Applied Behavior Analysis. These are taught as academic content, reinforced individually, and held to the same mastery standard as any subject."
        />

        <div className="mt-8">
          <DataTable
            caption="The three pivotal behavior pillars, their definitions and how they are practiced"
            headers={["Pillar", "Definition", "How it is developed"]}
            rowHeaders
            rows={behaviorPillars.map((p) => [p.name, p.definition, p.practice])}
          />
        </div>

        <div className="mt-12 max-w-3xl">
          <h3 className="font-serif text-xl font-bold text-navy-900">
            Responding to behavioral challenges
          </h3>
          <p className="mt-2 leading-relaxed text-ink-muted">
            No behavioral challenge is treated as a crisis here. It is treated as
            an instructional opportunity, and it follows a defined sequence:
          </p>
          <div className="mt-6">
            <ProcessSteps
              steps={behaviorResponseSteps.map((s) => ({ title: s }))}
            />
          </div>
        </div>

        <div className="mt-10 max-w-3xl">
          <Callout title="What we do not do" variant="statute">
            The VA School does not use punitive discipline, exclusionary
            practices, or shame-based responses. Suspension and expulsion are
            last-resort measures, used only where there is a threat to safety, and
            only after documented intervention efforts.
          </Callout>
        </div>
      </Section>

      {/* Taekwondo */}
      <Section id="taekwondo">
        <SectionHeading
          eyebrow="Section 5"
          title="Taekwondo requirements"
          lead="Taekwondo is a core component of enrollment — not an elective, not supplementary. It is the physical and philosophical vessel through which the school's values are practiced rather than merely discussed."
        />
        <Prose className="mt-6">
          <ul>
            {taekwondoRequirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Prose>
      </Section>

      {/* Graduation */}
      <Section id="graduation" tone="muted">
        <SectionHeading
          eyebrow="Section 6"
          title="Graduation requirements"
          lead="Graduation is not conferred by age or seat time. It is earned."
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <Prose>
            <h3>Academic requirements</h3>
            <ul>
              <li>
                Demonstrated mastery in all core subject areas: Mathematics,
                Science, English Language Arts, Social Studies
              </li>
              <li>
                Completion of applied subject requirements: Computer
                Science/Coding, Leadership Development
              </li>
              <li>
                Competency in all skills within the student&rsquo;s individualized
                progression sequence
              </li>
              <li>
                Demonstration of academic performance consistent with 12th-grade
                equivalency
              </li>
            </ul>
          </Prose>

          <Prose>
            <h3>Character &amp; physical requirements</h3>
            <ul>
              <li>
                Demonstrated mastery of all three Pivotal Behavior pillars,
                assessed through instructor observation, structured demonstration,
                and behavioral history
              </li>
              <li>
                Taekwondo rank consistent with black-belt level values and
                character standard, as assessed by the Head of School
              </li>
              <li>
                Demonstrated physical conditioning and self-discipline through
                sustained Taekwondo participation
              </li>
            </ul>
          </Prose>
        </div>

        <div className="mt-12">
          <h3 className="font-serif text-xl font-bold text-navy-900">
            Two graduation pathways
          </h3>
          <div className="mt-4">
            <DataTable
              caption="The two graduation pathways available to VA School students"
              headers={["Pathway", "Description"]}
              rowHeaders
              rows={graduationPathways.map((p) => [p.name, p.detail])}
            />
          </div>
        </div>

        <div className="mt-10 max-w-3xl">
          <Callout title="A note on graduation age" variant="statute">
            Iowa Code §299.1 establishes compulsory school attendance for children
            ages 6&ndash;16. There is no Iowa statute prohibiting graduation before
            age 18. The VA School&rsquo;s graduation standard is achievement-based,
            not age-based &mdash; a student who completes every requirement by age
            16 is fully eligible to receive a VA School diploma under Iowa law.
          </Callout>
        </div>
      </Section>

      <CTABand
        title="Questions about any of this?"
        lead="The intake meeting exists precisely so you can ask them. Start an application, or call and ask first — either order works."
      />
    </>
  );
}
