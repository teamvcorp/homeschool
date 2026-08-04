import type { Metadata } from "next";
import { higherInstitute, careerPathways, categoryStyles } from "@/lib/site";
import { PageHeader, Prose } from "@/app/components/ui/PageHeader";
import { Section, SectionHeading } from "@/app/components/ui/Section";
import { ComparisonTable } from "@/app/components/ui/Table";
import { Callout, Statement } from "@/app/components/ui/Callout";
import { CTABand } from "@/app/components/ui/CTABand";

/** Source: accreditation package Document 7 — The VA Higher Institute Program Framework. */
export const metadata: Metadata = {
  title: "The VA Higher Institute",
  description:
    "A two-year post-diploma career immersion program for ages 16–18. Four career pathways, industry certifications, up to 30 college credits, and a professional capstone.",
};

export default function HigherInstitutePage() {
  return (
    <>
      <PageHeader
        eyebrow="The VA Higher Institute &middot; Ages 16&ndash;18"
        title="Two years to become genuinely competent, before adulthood decides for you"
        lead="A post-diploma program for graduates who want real professional preparation instead of defaulting into a career path at 22."
      />

      {/* Premise */}
      <Section>
        <div className="max-w-3xl">
          <Statement>{higherInstitute.premise}</Statement>
          <Prose className="mt-8">
            <p>{higherInstitute.positioning}</p>
            <p>
              The Institute is where the translation from knowledge to competency
              happens &mdash; before age 18, and before a student picks a career by
              default.
            </p>
          </Prose>
        </div>

        <div className="mt-10 max-w-3xl">
          <Callout title="Eligibility">
            <ul className="flex list-disc flex-col gap-1.5 pl-4">
              {higherInstitute.eligibility.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              Iowa Code §299.1 compulsory attendance ends at age 16 or upon
              graduation. Enrollment in The VA Higher Institute is voluntary and
              does not constitute K&ndash;12 schooling.
            </p>
          </Callout>
        </div>
      </Section>

      {/* Two-year structure */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="Program structure"
          title="The two-year framework"
          lead="Five components, each escalating from supervised observation in Year 1 to genuine independent contribution in Year 2."
        />
        <div className="mt-10">
          <ComparisonTable
            caption="The five Higher Institute components across Year 1 and Year 2, with delivery model"
            columnLabels={[
              "Component",
              "Year 1 (age 16–17)",
              "Year 2 (age 17–18)",
              "Delivery model",
            ]}
            rows={higherInstitute.structure.map((c) => ({
              label: c.component,
              values: [c.yearOne, c.yearTwo, c.delivery],
            }))}
          />
        </div>
      </Section>

      {/* Pathways */}
      <Section id="pathways">
        <SectionHeading
          eyebrow="Career pathways"
          title="Four pathways"
          lead="Each pathway pairs a real workplace placement with the academic preparation that makes the placement make sense — plus the industry credentials that make it portable."
        />

        <div className="mt-12 flex flex-col gap-8">
          {careerPathways.map((pathway) => {
            const style = categoryStyles[pathway.color];
            return (
              <article
                key={pathway.id}
                className={`print-keep rounded-2xl border border-line border-l-4 bg-white p-7 shadow-sm ${style.border}`}
              >
                <h3 className={`font-serif text-2xl font-bold ${style.text}`}>
                  {pathway.name}
                </h3>
                <p className="mt-2 leading-relaxed text-ink-muted">
                  {pathway.audience}
                </p>

                <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
                      Field placements
                    </dt>
                    <dd className="mt-1 leading-relaxed text-ink-muted">
                      {pathway.placements}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
                      Academic preparation
                    </dt>
                    <dd className="mt-1 leading-relaxed text-ink-muted">
                      {pathway.academics}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
                      Certifications available
                    </dt>
                    <dd className="mt-1">
                      <ul className="flex flex-wrap gap-2">
                        {pathway.certifications.map((c) => (
                          <li
                            key={c}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${style.fill} ${style.text}`}
                          >
                            {c}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
                      Outcome
                    </dt>
                    <dd className="mt-1 leading-relaxed text-ink-muted">
                      {pathway.outcome}
                    </dd>
                  </div>
                </dl>

                {pathway.disclaimer ? (
                  <p className="mt-5 border-t border-line pt-4 text-sm italic leading-relaxed text-ink-subtle">
                    {pathway.disclaimer}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="mt-10 max-w-3xl">
          <Callout title="Iowa labor law compliance" variant="statute">
            Iowa Code Chapter 92 permits 16&ndash;17 year olds to work in the vast
            majority of occupational settings without a work permit. Hazardous
            occupation restrictions &mdash; mining, roofing, certain heavy
            manufacturing &mdash; are observed in all placement design, and Iowa
            Workforce Development is consulted for placement compliance review.
          </Callout>
        </div>
      </Section>

      {/* Dual enrollment & completion */}
      <Section tone="navy">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              onNavy
              eyebrow="Dual enrollment"
              title="Up to 30 college credits, at no cost to the family"
            />
            <p className="mt-6 leading-relaxed text-navy-100">
              {higherInstitute.dualEnrollment}
            </p>
          </div>
          <div>
            <SectionHeading
              onNavy
              eyebrow="Program completion"
              title="What a graduate leaves with"
            />
            <p className="mt-6 leading-relaxed text-navy-100">
              {higherInstitute.completion}
            </p>
            <ul className="mt-6 flex list-none flex-col gap-3">
              {[
                "A high school diploma",
                "Up to 30 transferable college credits",
                "Two years of documented career field experience",
                "Industry-recognized credentials",
                "A professional capstone reviewed by practitioners",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg
                    className="mt-1 h-4 w-4 shrink-0 text-gold-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-navy-100">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm italic leading-relaxed text-navy-300">
              A portfolio few four-year college graduates can match &mdash; at
              eighteen.
            </p>
          </div>
        </div>
      </Section>

      <CTABand
        title="Interested in a partnership?"
        lead="The Institute depends on employers willing to host a serious 16-year-old. If your organization would consider a placement, we would like to hear from you."
        primaryLabel="Enroll a student"
      />
    </>
  );
}
