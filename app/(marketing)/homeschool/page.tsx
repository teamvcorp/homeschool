import type { Metadata } from "next";
import { school, homeschoolAtHome, dailyApp } from "@/lib/site";
import { PageHeader, Prose, FactList } from "@/app/components/ui/PageHeader";
import { Section, SectionHeading } from "@/app/components/ui/Section";
import { Card, CardTitle, CardBody, CardGrid } from "@/app/components/ui/Card";
import { ComparisonTable } from "@/app/components/ui/Table";
import { Callout } from "@/app/components/ui/Callout";
import { ButtonLink, ExternalButtonLink } from "@/app/components/ui/Button";

/**
 * HOMESCHOOL AT HOME — the support tier ($19.95 first child, $10 each additional).
 *
 * NO SOURCE DOCUMENT, DELIBERATELY. Every other marketing page traces to a section of
 * the Iowa DE accreditation package; this one does not, because the tier is a support
 * SERVICE sold to families who remain independent homeschoolers under Iowa CPI. It is
 * kept out of the packet on purpose — see the banner comment on `homeschoolAtHome` in
 * lib/site.ts, and the /homeschool row in docs/content-sources.md.
 *
 * SIGN-UP HAPPENS IN THE APP. This page describes the tier and links `dailyApp.signupUrl`
 * (app.vaschool.org/enroll), where the family creates an account and pays by card. It
 * must link SIGN-UP, never LOGIN — a visitor here has no account yet, and a login wall is
 * the worst answer to "I want to sign up". scripts/e2e/verify-homeschool.mjs asserts both.
 *
 * STATIC BY DESIGN. This page once carried a signed-timestamp form and therefore had to
 * be `force-dynamic`. With the form gone it is plain JSX over constants and must build
 * as a static (○) route. If it ever shows as ƒ in the build output, something added a
 * per-request read — see docs/forms-and-validation.md before adding a form back.
 */

export const metadata: Metadata = {
  title: "Homeschool at Home",
  description: `${homeschoolAtHome.monthlyFeeLabel}. ${homeschoolAtHome.summary} Iowa ESA funding does not apply to this tier.`,
};

export default function HomeschoolPage() {
  return (
    <>
      <PageHeader
        eyebrow="Homeschool at Home"
        title="Homeschool with us behind you"
        lead={`${homeschoolAtHome.positioning} ${homeschoolAtHome.monthlyFeeLabel}.`}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          {/* Same-tab on purpose: sign-up is the next step of this journey, not a side
              trip, so a new tab would only leave a stale sales page behind. */}
          <ExternalButtonLink href={dailyApp.signupUrl} variant="gold" size="lg">
            Sign up in the app
          </ExternalButtonLink>
          <ExternalButtonLink href={school.phoneHref} variant="ghostOnNavy" size="lg">
            Call {school.phone}
          </ExternalButtonLink>
        </div>
      </PageHeader>

      {/* ---------------------------------------------------------------- price */}
      <Section>
        <SectionHeading
          eyebrow="What it costs"
          title={`${homeschoolAtHome.firstChildMonthlyLabel} a month, ${homeschoolAtHome.additionalChildMonthlyLabel} for each sibling`}
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

      {/* ----------------------------------------------------------- get started */}
      {/* Replaces the old interest form. Sign-up, the account and card billing all live
          in the app now, so this page's whole job ends at a link. */}
      <Section id="get-started" width="narrow">
        <SectionHeading
          eyebrow="Get started"
          title="Sign up in the School Day app"
          lead="You create your account, add your children, confirm your email, and pay by card. Your children can start the same day."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <ExternalButtonLink href={dailyApp.signupUrl} variant="gold" size="lg">
            Sign up at app.vaschool.org
          </ExternalButtonLink>
          <ExternalButtonLink href={school.phoneHref} variant="outline" size="lg">
            Questions? Call {school.phone}
          </ExternalButtonLink>
        </div>
        <p className="mt-6 leading-relaxed text-ink-muted">
          {homeschoolAtHome.monthlyFeeNote}
        </p>
      </Section>
    </>
  );
}
