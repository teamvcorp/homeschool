import type { Metadata } from "next";
import Link from "next/link";
import { school, admissionsSteps, nonDiscrimination, cohorts, categoryStyles } from "@/lib/site";
import { PageHeader, Prose } from "@/app/components/ui/PageHeader";
import { Section, SectionHeading } from "@/app/components/ui/Section";
import { ProcessSteps } from "@/app/components/ui/ProcessSteps";
import { Callout } from "@/app/components/ui/Callout";
import { ButtonLink, ExternalButtonLink, ArrowIcon } from "@/app/components/ui/Button";
import { CTABand } from "@/app/components/ui/CTABand";

/** Source: accreditation package Document 4 §4.2 — Enrollment & Admissions. */
export const metadata: Metadata = {
  title: "Admissions",
  description:
    "How to enroll at The VA School: application, intake meeting with the Head of School, observational placement assessment, and confirmation. Open to all academic and behavioral starting points.",
};

export default function AdmissionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admissions"
        title="How to enroll"
        lead="Four steps. No entrance exam, no minimum test score, and no gatekeeping on where your student is starting from."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/enroll" variant="gold" size="lg">
            Begin an application
            <ArrowIcon />
          </ButtonLink>
          <ExternalButtonLink
            href={school.phoneHref}
            variant="ghostOnNavy"
            size="lg"
          >
            Call {school.phone}
          </ExternalButtonLink>
        </div>
      </PageHeader>

      {/* Who we serve */}
      <Section>
        <SectionHeading
          eyebrow="Who we serve"
          title="Especially the students other schools have given up on"
        />
        <Prose className="mt-6">
          <p>
            The VA School accepts students in grades Kindergarten through 12, and
            eligible graduates into The VA Higher Institute. The school is built
            for students at <strong>every</strong> academic and behavioral
            starting point.
          </p>
          <p>
            No student is turned away because of academic gaps, behavioral
            history, or prior school difficulty. If your student has been told
            they are behind, disruptive, or not college material &mdash; that is
            not a disqualification here. It is the reason this model exists.
          </p>
        </Prose>

        <div className="mt-8 max-w-3xl">
          <Callout title="Non-discrimination">{nonDiscrimination}</Callout>
        </div>
      </Section>

      {/* The process */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="The process"
          title="What actually happens, step by step"
        />
        <div className="mt-10 max-w-3xl">
          <ProcessSteps steps={admissionsSteps} />
        </div>

        <div className="mt-10 max-w-3xl">
          <Callout title="About the assessment" variant="statute">
            Step three is not a test to pass. It is informal and observational,
            and its only purpose is to find out where your student genuinely is so
            we can start there. There is nothing to study for, and no result that
            disqualifies a student from enrolling.
          </Callout>
        </div>
      </Section>

      {/* Cohort placement */}
      <Section>
        <SectionHeading
          eyebrow="Placement"
          title="Where your student will be placed"
          lead="Cohorts reflect current academic and developmental stage rather than age alone — which is how a student can be reading ahead of grade level and working through a math gap at the same time."
        />
        <ul className="mt-10 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cohorts.map((c) => (
            <li
              key={c.id}
              className={`rounded-2xl border border-line border-l-4 bg-white p-5 ${
                categoryStyles[c.color].border
              }`}
            >
              <p
                className={`text-xs font-bold uppercase tracking-[0.12em] ${
                  categoryStyles[c.color].text
                }`}
              >
                {c.range}
              </p>
              <h2 className="mt-1 font-serif text-lg font-bold text-navy-900">
                {c.name}
              </h2>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm leading-relaxed text-ink-subtle">
          Read what each cohort focuses on in the{" "}
          <Link
            href="/curriculum"
            className="font-medium text-navy-700 underline hover:text-navy-900"
          >
            curriculum overview
          </Link>
          .
        </p>
      </Section>

      {/* What to know before applying */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="Before you apply"
          title="Three things worth knowing"
          lead="We would rather you know these up front than discover them in month two."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Taekwondo is required",
              body: "It is not an elective or an add-on. Every student trains, and belt progression is a formal assessment system. If that is a dealbreaker, this is not the right school.",
            },
            {
              title: "Progression is earned, not scheduled",
              body: "Your student advances when they demonstrate mastery. That can mean moving faster than their grade level — and it can mean staying on something longer than a traditional school would.",
            },
            {
              title: "Families are expected to engage",
              body: "You will hear from us, and we will expect prompt communication about absences and concerns. The model depends on it.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-line bg-white p-6"
            >
              <h3 className="font-serif text-lg font-bold text-navy-900">
                {item.title}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-muted">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm leading-relaxed text-ink-subtle">
          All policies are published in full in the{" "}
          <Link
            href="/handbook"
            className="font-medium text-navy-700 underline hover:text-navy-900"
          >
            Student &amp; Family Handbook
          </Link>
          , which you will affirm at enrollment.
        </p>
      </Section>

      <CTABand />
    </>
  );
}
