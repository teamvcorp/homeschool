import Link from "next/link";
import { philosophy } from "@/lib/site";
import { Section, SectionHeading } from "../ui/Section";

/**
 * The six philosophy pillars from Document 2 §2.3.
 *
 * This replaces the old four-item "Pillars" section (Collaboration, Leadership,
 * Critical Thinking, Problem Solving) — those were generic education buzzwords
 * that appear nowhere in the school's own documentation. The real six are
 * specific, argumentative, and considerably more interesting.
 */
export default function Philosophy() {
  return (
    <Section id="philosophy">
      <SectionHeading
        eyebrow="What we believe"
        title="Six convictions that shape everything"
        lead="These are not slogans. Each one changes something concrete about how instruction is delivered and how students are assessed."
      />

      <ul className="mt-12 grid list-none grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-2">
        {philosophy.map((pillar, i) => (
          <li key={pillar.title} className="flex gap-5">
            <span
              aria-hidden="true"
              className="font-serif text-3xl font-bold text-gold-300"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="font-serif text-xl font-bold text-navy-900">
                {pillar.title}
              </h3>
              <p className="mt-1 font-medium leading-relaxed text-gold-700">
                {pillar.summary}
              </p>
              <p className="mt-2 leading-relaxed text-ink-muted">{pillar.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-sm leading-relaxed text-ink-subtle">
        These convictions are expressed day to day through five values drawn from
        the traditional Taekwondo tenets &mdash;{" "}
        <Link
          href="/mission"
          className="font-medium text-navy-700 underline hover:text-navy-900"
        >
          see the full philosophy and values
        </Link>
        .
      </p>
    </Section>
  );
}
