import type { Metadata } from "next";
import Link from "next/link";
import { school, homeschoolAtHome, dailyApp } from "@/lib/site";
import { issueFormTimestamp } from "@/lib/anti-abuse";
import { PageHeader, Prose, FactList } from "@/app/components/ui/PageHeader";
import { Section, SectionHeading } from "@/app/components/ui/Section";
import { Card, CardTitle, CardBody, CardGrid } from "@/app/components/ui/Card";
import { ComparisonTable } from "@/app/components/ui/Table";
import { Callout } from "@/app/components/ui/Callout";
import { ButtonLink, ExternalButtonLink } from "@/app/components/ui/Button";
import HomeschoolInterestForm from "@/app/components/forms/HomeschoolInterestForm";

/**
 * HOMESCHOOL AT HOME — the $20/month support tier.
 *
 * NO SOURCE DOCUMENT, DELIBERATELY. Every other marketing page traces to a section of
 * the Iowa DE accreditation package; this one does not, because the tier is a support
 * SERVICE sold to families who remain independent homeschoolers under Iowa CPI. It is
 * kept out of the packet on purpose — see the banner comment on `homeschoolAtHome` in
 * lib/site.ts, and the /homeschool row in docs/content-sources.md.
 *
 * ⚠️  THIS PAGE SELLS THE SCHOOL DAY APP BUT MUST NEVER LINK ITS LOGIN. A visitor here
 * has not signed up and has no account; a login wall is the worst possible answer to
 * "I want to sign up". Read the three-audience rule on `dailyApp` in lib/site.ts.
 * scripts/e2e/verify-homeschool.mjs asserts the absence of that link.
 */

export const metadata: Metadata = {
  title: "Homeschool at Home",
  description: `${homeschoolAtHome.monthlyFeeLabel}. ${homeschoolAtHome.summary} Iowa ESA funding does not apply to this tier.`,
};

/**
 * ⚠️  THIS IS LOAD-BEARING, NOT PERFORMANCE TUNING. DO NOT DELETE IT, AND DO NOT
 * "OPTIMISE" IT BACK TO A STATIC OR ISR PAGE.
 *
 * This is the only marketing page carrying a public form, and that makes it the only one
 * that cannot be prerendered. Two independent reasons, either one fatal:
 *
 * 1. THE BUILD WOULD FAIL. issueFormTimestamp() signs with FORM_HMAC_SECRET, and
 *    lib/env.ts throws on a missing secret. Prerendering evaluates that at BUILD time,
 *    and this project requires `npm run build` to pass with .env.local ABSENT (see
 *    docs/verification.md). `export const revalidate` does NOT avoid this — ISR still
 *    renders the first copy at build. Verified: the build failed with
 *    "Error occurred prerendering page /homeschool ... FORM_HMAC_SECRET: expected string,
 *    received undefined" until this line became force-dynamic.
 *
 * 2. THE FORM WOULD SILENTLY DIE TWELVE HOURS AFTER EVERY DEPLOY. The timestamp is minted
 *    AT RENDER TIME and lib/anti-abuse.ts rejects any form older than MAX_FORM_AGE_MS
 *    (12h). A build-time token outlives its own validity within half a day, after which
 *    EVERY submission is told the form "was left open for a while and has expired". The
 *    page would look perfectly fine; the only evidence would be one log line:
 *
 *        [anti-abuse] timestamp stale on homeschool-interest
 *
 *    A long `revalidate` narrows that window but never closes it — a page with no traffic
 *    is not revalidated, so the stale copy is exactly what the next visitor is served.
 *
 * The enroll step page never hits either problem because reading the draft cookie already
 * makes it dynamic. A marketing page has no such accident to save it.
 *
 * The cost is rendering this page per request. At this school's traffic that is nothing,
 * and the content is static JSX over in-memory constants — no database, no fetch.
 *
 * THIS APPLIES TO ANY FUTURE PUBLIC FORM ON A MARKETING PAGE. See docs/forms-and-validation.md.
 */
export const dynamic = "force-dynamic";

export default function HomeschoolPage() {
  const timestamp = issueFormTimestamp();

  return (
    <>
      <PageHeader
        eyebrow="Homeschool at Home"
        title="Homeschool with us behind you"
        lead={`${homeschoolAtHome.positioning} ${homeschoolAtHome.monthlyFeeLabel}.`}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/homeschool#interest" variant="gold" size="lg">
            Tell us about your family
          </ButtonLink>
          <ExternalButtonLink href={school.phoneHref} variant="ghostOnNavy" size="lg">
            Call {school.phone}
          </ExternalButtonLink>
        </div>
      </PageHeader>

      {/* ---------------------------------------------------------------- price */}
      <Section>
        <SectionHeading
          eyebrow="What it costs"
          title="Twenty dollars, per child, per month"
          lead="Stated plainly, with what it does and does not buy."
        />
        <div className="mt-8 max-w-3xl">
          <FactList
            items={[
              { label: "Monthly fee", value: homeschoolAtHome.monthlyFeeLabel },
              { label: "Billing", value: homeschoolAtHome.monthlyFeeNote },
              { label: "Iowa ESA", value: homeschoolAtHome.esaNote },
              {
                label: "What this is not",
                value: homeschoolAtHome.independenceStatement,
              },
            ]}
          />
        </div>
      </Section>

      {/* ------------------------------------------------------------- includes */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="What you get"
          title="Everything we use with our own students"
          lead={dailyApp.homeschoolAccess}
        />
        <div className="mt-10">
          <CardGrid columns={3}>
            {homeschoolAtHome.includes.map((item) => (
              <Card key={item.title} as="li" accent="blue">
                <CardTitle accent="blue">{item.title}</CardTitle>
                <CardBody>{item.detail}</CardBody>
              </Card>
            ))}
          </CardGrid>
        </div>
      </Section>

      {/* ------------------------------------------------------------ taekwondo */}
      <Section>
        <SectionHeading
          eyebrow="Physical education"
          title={homeschoolAtHome.inPersonTaekwondo.headline}
        />
        <div className="mt-6">
          <Prose>
            <p>{homeschoolAtHome.inPersonTaekwondo.body}</p>
            <p>
              Taekwondo is not an elective here — it is how this school teaches
              discipline, and it is the one part of campus life open to families who are
              not enrolled. It is also, in our experience, how a family finds out whether
              this school is right for them.{" "}
              <Link href="/curriculum">See how instruction works</Link>.
            </p>
          </Prose>
        </div>
        {/* ⚠️  `availability` MUST travel with the Taekwondo promise. This tier is sold to
            families too far away to attend, and a flat "included" would promise something
            we cannot deliver. See the warning on inPersonTaekwondo in lib/site.ts. */}
        <div className="mt-8 max-w-3xl">
          <Callout title="Before you count on it">
            <p>{homeschoolAtHome.inPersonTaekwondo.availability}</p>
            <p className="mt-3">
              {homeschoolAtHome.inPersonTaekwondo.beforeFirstClass}
            </p>
          </Callout>
        </div>
      </Section>

      {/* ------------------------------------------------------------- excludes */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="The honest limits"
          title="What this tier is not"
          lead="Said plainly up front, so nothing here is a surprise six months in."
        />
        <div className="mt-10">
          <CardGrid columns={2}>
            {homeschoolAtHome.excludes.map((item) => (
              <Card key={item.title} as="li" accent="red">
                <CardTitle accent="red">{item.title}</CardTitle>
                <CardBody>{item.detail}</CardBody>
              </Card>
            ))}
          </CardGrid>
        </div>
      </Section>

      {/* ----------------------------------------------------------- comparison */}
      <Section>
        <SectionHeading
          eyebrow="Side by side"
          title="This tier, and full enrollment"
          lead="The same facts in one table, so you can see exactly where the line falls."
        />
        <div className="mt-10">
          <ComparisonTable
            caption="Homeschool at Home compared with full enrollment at The VA School"
            columnLabels={homeschoolAtHome.comparisonColumns}
            rows={homeschoolAtHome.comparisonRows}
          />
        </div>
      </Section>

      {/* --------------------------------------------------------- legal status */}
      <Section tone="muted" width="narrow">
        <SectionHeading eyebrow="Your legal position" title="You are still the school" />
        <div className="mt-6">
          {/* `statute` is this site's citation style — the right register for a statement
              about a family's legal responsibilities. No Iowa Code section number is
              cited here on purpose: an unverified statutory reference on a public page is
              worse than none. See docs/content-sources.md. */}
          <Callout variant="statute" title="Competent Private Instruction">
            {homeschoolAtHome.independenceStatement}
          </Callout>
          <div className="mt-6">
            <Prose>
              <p>
                That is not a disclaimer — it is the point. You keep control of what your
                children learn and when, and we supply the parts that are hard to build
                alone: the sequence, the standards, someone to ask, and someone to grade.
              </p>
            </Prose>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- stepUp */}
      <Section tone="navy">
        <SectionHeading
          onNavy
          eyebrow="When you are ready"
          title={homeschoolAtHome.stepUp.headline}
          lead={homeschoolAtHome.stepUp.body}
        />
        <ul className="mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
          {homeschoolAtHome.stepUp.signals.map((signal) => (
            <li
              key={signal}
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-4 leading-relaxed text-white/90"
            >
              {signal}
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-3xl leading-relaxed text-white/80">
          {homeschoolAtHome.stepUp.costComparison}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {/* ⚠️  POINTS AT /admissions, NOT /enroll. A family reading this page is by
              definition not ready to sign an agreement; dropping them into the wizard is
              the mirror image of the login-wall mistake. */}
          <ButtonLink href="/admissions" variant="gold" size="lg">
            {homeschoolAtHome.stepUp.ctaLabel}
          </ButtonLink>
          <ButtonLink href="/tuition" variant="ghostOnNavy" size="lg">
            Tuition &amp; Iowa ESA
          </ButtonLink>
        </div>
      </Section>

      {/* ------------------------------------------------------------------ form */}
      <Section id="interest" width="narrow">
        <SectionHeading
          eyebrow="Get started"
          title="Tell us about your family"
          lead="No account to create and nothing to pay yet. The Head of School reads these and calls within two school days."
        />
        <div className="mt-8">
          <HomeschoolInterestForm timestamp={timestamp} />
        </div>
      </Section>
    </>
  );
}
