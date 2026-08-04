import Link from "next/link";
import { mission, wholePartWhole } from "@/lib/site";
import { Section, SectionHeading } from "../ui/Section";
import { CycleSteps } from "../ui/ProcessSteps";
import { Statement } from "../ui/Callout";

/**
 * The mission statement plus the Whole-Part-Whole instructional cycle — the two
 * things that actually distinguish this school, so they sit high on the page.
 *
 * Replaces the old generic "Mission" section, whose copy described a
 * collaboration between martial arts schools and virtual coursework rather than
 * the instructional model the accreditation package documents.
 */
export default function MasteryModel() {
  return (
    <Section id="mission" tone="muted">
      <SectionHeading
        eyebrow="Our mission"
        title="Every student, held to the same standard"
        lead="Differentiation happens in the path, never in the destination."
      />

      <div className="mt-8 max-w-3xl">
        <Statement>{mission}</Statement>
      </div>

      <div className="mt-16">
        <h3 className="font-serif text-2xl font-bold text-navy-900">
          How a day actually works: the Whole&ndash;Part&ndash;Whole cycle
        </h3>
        <p className="mt-3 max-w-3xl leading-relaxed text-ink-muted">
          Every subject runs on the same repeating cycle. No concept is withheld
          from a younger student, and no student is left working alone on
          something they have not been taught.
        </p>

        <div className="mt-8 max-w-4xl">
          <CycleSteps phases={wholePartWhole} />
        </div>

        <p className="mt-8 text-sm leading-relaxed text-ink-subtle">
          Read the full instructional framework, subject scope, and mastery
          assessment method on the{" "}
          <Link
            href="/curriculum"
            className="font-medium text-navy-700 underline hover:text-navy-900"
          >
            curriculum page
          </Link>
          .
        </p>
      </div>
    </Section>
  );
}
