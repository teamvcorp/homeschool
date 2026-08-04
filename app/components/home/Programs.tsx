import Link from "next/link";
import { coreSubjects, enrichmentSubjects, categoryStyles } from "@/lib/site";
import { Section, SectionHeading } from "../ui/Section";
import ImagePlaceholder from "../ImagePlaceholder";

/**
 * What is actually taught — Document 3 §3.3.
 *
 * The previous version of this section advertised four programs (Robotics, AI &
 * Programming, Mechanics, Micro Societies). Those map onto real enrichment
 * subjects but were presented as the whole curriculum, which understated the
 * core academic scope. Core subjects lead now; enrichment follows.
 */
export default function Programs() {
  return (
    <Section id="programs">
      <SectionHeading
        eyebrow="Scope of instruction"
        title="A full academic program, taken as far as each student can go"
        lead="Every core subject is taught to the highest level the student can reach — not to a grade-level ceiling."
      />

      {/* Core academics */}
      <div className="mt-12">
        <h3 className="font-serif text-xl font-bold text-navy-900">
          Core academic subjects
        </h3>
        <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {coreSubjects.map((subject) => (
            <div
              key={subject.name}
              className="rounded-xl border border-line bg-white p-5"
            >
              <dt className="font-serif text-lg font-bold text-navy-900">
                {subject.name}
              </dt>
              <dd className="mt-1 leading-relaxed text-ink-muted">
                {subject.scope}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Enrichment */}
      <div className="mt-16">
        <h3 className="font-serif text-xl font-bold text-navy-900">
          Enrichment &amp; applied subjects
        </h3>
        <p className="mt-2 max-w-3xl leading-relaxed text-ink-muted">
          Not electives at the margins &mdash; these are scheduled, assessed, and
          required for graduation.
        </p>

        <ul className="mt-6 grid list-none grid-cols-1 gap-6 sm:grid-cols-2">
          {enrichmentSubjects.map((subject) => (
            <li
              key={subject.name}
              className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-shadow hover:shadow-lg"
            >
              <ImagePlaceholder
                src={subject.image}
                alt={`${subject.name} instruction at The VA School`}
                aspectRatio="aspect-[16/9]"
                className="rounded-none"
                sizes="(max-width: 640px) 100vw, 500px"
              />
              <div className="p-5">
                <h4
                  className={`font-serif text-lg font-bold ${
                    categoryStyles[subject.color].text
                  }`}
                >
                  {subject.name}
                </h4>
                <p className="mt-1 leading-relaxed text-ink-muted">
                  {subject.scope}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-12 text-sm leading-relaxed text-ink-subtle">
        Graduates who want professional preparation before adulthood continue into{" "}
        <Link
          href="/higher-institute"
          className="font-medium text-navy-700 underline hover:text-navy-900"
        >
          The VA Higher Institute
        </Link>{" "}
        &mdash; two years of supervised career immersion with up to 30 college
        credits.
      </p>
    </Section>
  );
}
