import { homeschoolAtHome } from "@/lib/site";
import { Section, SectionHeading } from "../ui/Section";
import { ButtonLink, ArrowIcon } from "../ui/Button";

/**
 * Homeschool at Home — the support tier (from $19.95/month), on the home page.
 *
 * ⚠️  PLACEMENT IS AN ARGUMENT, AND IT IS DELIBERATE. This sits AFTER `TuitionTeaser`,
 * never before it. The home page sells the school first; this section catches the family
 * the enrollment pitch did not convince, on their way out. Moving it above the tuition
 * block would lead with the cheap option and undercut the thing this school actually does.
 *
 * ⚠️  NO SOURCE DOCUMENT, and it is not a school program. See the banner comment on
 * `homeschoolAtHome` in lib/site.ts, and the /homeschool row in docs/content-sources.md.
 *
 * Kept visually quieter than the enrollment CTA above it — an outline button on the
 * default (not muted) ground, no price card, no display numerals. Same reasoning as
 * CurrentFamilies: a secondary audience gets a real signpost, not competing volume.
 */
export default function HomeschoolTeaser() {
  return (
    <Section id="homeschool">
      <div className="grid items-start gap-8 lg:grid-cols-[2fr_1fr] lg:gap-16">
        <div>
          <SectionHeading
            eyebrow="Not ready to enroll?"
            title="Homeschool with us behind you"
            lead={homeschoolAtHome.positioning}
          />
          <p className="mt-6 max-w-2xl leading-relaxed text-ink-muted">
            {homeschoolAtHome.monthlyFeeLabel}. You keep teaching at home; we supply the
            curriculum, the app our students use, a teacher to ask, and the grading.{" "}
            {homeschoolAtHome.esaNote}
          </p>
          <ButtonLink href="/homeschool" variant="outline" className="mt-8">
            See Homeschool at Home
            <ArrowIcon />
          </ButtonLink>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
            What it costs
          </p>
          <p className="mt-3 font-serif text-4xl font-bold text-navy-900">
            {homeschoolAtHome.firstChildMonthlyLabel}
            <span className="ml-2 align-middle text-base font-medium text-ink-subtle">
              / month, first child
            </span>
          </p>
          <p className="mt-1 text-sm font-medium text-ink-muted">
            + {homeschoolAtHome.additionalChildMonthlyLabel} / month for each additional child
          </p>
          <p className="mt-3 leading-relaxed text-ink-muted">
            {homeschoolAtHome.monthlyFeeNote}
          </p>
        </div>
      </div>
    </Section>
  );
}
