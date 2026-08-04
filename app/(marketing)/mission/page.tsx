import type { Metadata } from "next";
import { mission, vision, philosophy, values } from "@/lib/site";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Section, SectionHeading } from "@/app/components/ui/Section";
import { Statement } from "@/app/components/ui/Callout";
import { DataTable } from "@/app/components/ui/Table";
import { CTABand } from "@/app/components/ui/CTABand";

/** Source: accreditation package Document 2 — Mission, Vision & Educational Philosophy. */
export const metadata: Metadata = {
  title: "Mission & Philosophy",
  description:
    "Our mission, vision, six core educational convictions, and the five values drawn from traditional Taekwondo tenets that shape daily practice at The VA School.",
};

export default function MissionPage() {
  return (
    <>
      <PageHeader
        eyebrow="Mission, vision &amp; philosophy"
        title="What we believe, stated plainly"
        lead="Most schools publish a mission statement and then operate on unstated assumptions. These are the convictions that actually determine how instruction is delivered here — and each one costs us something to hold."
      />

      {/* Mission & vision */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading eyebrow="Mission" title="Why the school exists" />
            <div className="mt-6">
              <Statement>{mission}</Statement>
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Vision" title="What a graduate looks like" />
            <p className="mt-6 text-lg leading-relaxed text-ink-muted">
              {vision}
            </p>
          </div>
        </div>
      </Section>

      {/* Six convictions */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="Core educational philosophy"
          title="Six convictions"
          lead="Read these as claims we are willing to be held to, not as marketing copy."
        />

        <ol className="mt-12 flex list-none flex-col gap-10">
          {philosophy.map((pillar, i) => (
            <li
              key={pillar.title}
              className="grid gap-4 border-t border-line pt-8 md:grid-cols-4 md:gap-8"
            >
              <div className="md:col-span-1">
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl font-bold text-gold-300"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-2 font-serif text-xl font-bold text-navy-900">
                  {pillar.title}
                </h2>
              </div>
              <div className="md:col-span-3">
                <p className="font-medium leading-relaxed text-gold-700">
                  {pillar.summary}
                </p>
                <p className="mt-3 leading-relaxed text-ink-muted">
                  {pillar.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* Values */}
      <Section>
        <SectionHeading
          eyebrow="Our values"
          title="Five values, aligned with the Taekwondo tenets"
          lead="These are not posters on a wall. They are the vocabulary instructors use when coaching a student through a hard moment, and they are assessed as part of the graduation standard."
        />

        <div className="mt-10">
          <DataTable
            caption="The five VA School values and their applied meaning"
            headers={["Value", "Applied meaning at The VA School"]}
            rowHeaders
            rows={values.map((v) => [v.name, v.meaning])}
          />
        </div>
      </Section>

      <CTABand
        title="If this sounds like the school you have been looking for"
        lead="Enrollment is open across all cohorts. The first step is an application; the second is an honest conversation."
      />
    </>
  );
}
