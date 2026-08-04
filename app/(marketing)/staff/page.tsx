import type { Metadata } from "next";
import {
  school,
  headOfSchool,
  instructorRequirements,
  instructorPreferred,
} from "@/lib/site";
import { PageHeader, Prose, FactList } from "@/app/components/ui/PageHeader";
import { Section, SectionHeading } from "@/app/components/ui/Section";
import { Callout } from "@/app/components/ui/Callout";
import { ExternalButtonLink, ArrowIcon } from "@/app/components/ui/Button";

/** Source: accreditation package Document 5 — Staff Qualifications & Instructor Framework. */
export const metadata: Metadata = {
  title: "Staff & Instructors",
  description: `Led by ${headOfSchool.name}, with masters-level preparation in Applied Behavior Analysis, Education, Clinical Mental Health Counseling, and Taekwondo instruction.`,
};

export default function StaffPage() {
  return (
    <>
      <PageHeader
        eyebrow="Staff &amp; instructors"
        title="Who teaches here"
        lead="Iowa does not require teacher certification for nonpublic school instructors. We hold our staff to a higher bar than the state asks for, because the instructional model does not work without it."
      />

      {/* Head of School */}
      <Section>
        <SectionHeading eyebrow="Head of School" title={headOfSchool.name} />

        <div className="mt-8 max-w-3xl">
          <FactList
            items={[
              { label: "Title", value: headOfSchool.title },
              { label: "Experience", value: headOfSchool.experience },
              {
                label: "Credentials",
                value: (
                  <ul className="flex list-disc flex-col gap-1 pl-4">
                    {headOfSchool.credentials.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                ),
              },
              { label: "ABA competencies", value: headOfSchool.abaCompetencies },
              {
                label: "Taekwondo",
                value:
                  "Master-level rank; certified instructor; curriculum design and rank assessment",
              },
              { label: "Role at the school", value: headOfSchool.role },
            ]}
          />
        </div>
      </Section>

      {/* Instructor standards */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="Instructor framework"
          title="What we require of every instructor"
          lead="Full-time, part-time, and volunteer alike. These are conditions of serving in an instructional role, not aspirations."
        />

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="font-serif text-lg font-bold text-navy-900">
              Required of all instructors
            </h3>
            <Prose className="mt-4">
              <ul>
                {instructorRequirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Prose>
          </div>

          <div>
            <h3 className="font-serif text-lg font-bold text-navy-900">
              Preferred credentials
            </h3>
            <Prose className="mt-4">
              <ul>
                {instructorPreferred.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Prose>
          </div>
        </div>

        <div className="mt-10 max-w-3xl">
          <Callout title="Background screening" variant="statute">
            Background check clearance is required <strong>before</strong> any
            student contact &mdash; without exception, and regardless of whether
            the role is paid, part-time, or volunteer.
          </Callout>
        </div>
      </Section>

      {/* Recruitment */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="We are hiring"
              title="Instructors &amp; parent volunteers"
              lead="The VA School is actively recruiting. If you have genuine subject-matter depth and the patience to teach one student at a time at their actual level, we want to talk."
            />
            <Prose className="mt-6">
              <p>
                Every applicant goes through an interview, background screening,
                and orientation before working with students. Instructors also
                complete foundational ABA training and a Taekwondo orientation,
                both provided by the Head of School &mdash; you do not need to
                arrive with either.
              </p>
            </Prose>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ExternalButtonLink
                href={`mailto:${school.email}?subject=Instructor%20%2F%20volunteer%20inquiry`}
                variant="primary"
                size="lg"
              >
                Email the Head of School
                <ArrowIcon />
              </ExternalButtonLink>
              <ExternalButtonLink
                href={school.phoneHref}
                variant="outline"
                size="lg"
              >
                {school.phone}
              </ExternalButtonLink>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface-muted p-8">
            <h3 className="font-serif text-lg font-bold text-navy-900">
              Instructor log
            </h3>
            <p className="mt-2 leading-relaxed text-ink-muted">
              The school maintains a formal instructor log recording name, role,
              credentials, and start date for every person in an instructional
              role, alongside compliance records for ABA training, Taekwondo
              orientation, subject-matter competency, background check clearance,
              and the signed Instructor Agreement.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-subtle">
              This log forms part of the school&rsquo;s Iowa Department of
              Education accreditation submission and is maintained in the
              school&rsquo;s records system.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
