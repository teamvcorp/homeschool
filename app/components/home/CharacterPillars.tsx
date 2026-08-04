import Link from "next/link";
import { behaviorPillars } from "@/lib/site";
import { Section, SectionHeading } from "../ui/Section";

/**
 * The Three Pillars of Pivotal Behavior — Document 4 §4.6.
 *
 * Rendered on navy because this is the school's sharpest claim: character is not
 * an assembly-hall poster here, it is coursework with a mastery standard and a
 * graduation requirement attached.
 */
export default function CharacterPillars() {
  return (
    <Section tone="navy">
      <SectionHeading
        onNavy
        eyebrow="Character as coursework"
        title="Three pivotal behaviors, taught and assessed like any subject"
        lead="Pivotal behaviors are the ones that, once established, generalize across every environment — so they do not have to be re-taught situation by situation. Each is graded on a five-point generalization scale and each is required to graduate."
      />

      <ul className="mt-12 grid list-none grid-cols-1 gap-8 md:grid-cols-3">
        {behaviorPillars.map((pillar) => (
          <li
            key={pillar.id}
            className="border-t-2 border-gold-400 pt-5"
          >
            <h3 className="font-serif text-xl font-bold text-white">
              {pillar.name}
            </h3>
            <p className="mt-3 leading-relaxed text-navy-100">
              {pillar.definition}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-navy-300">
              {pillar.practice}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-sm leading-relaxed text-navy-300">
        When a student struggles, the response is instructional rather than
        punitive &mdash; no exclusionary discipline, no shame-based correction.{" "}
        <Link
          href="/handbook"
          className="font-medium text-gold-300 underline hover:text-gold-200"
        >
          See the behavioral framework in the handbook
        </Link>
        .
      </p>
    </Section>
  );
}
