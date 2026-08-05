import type { Metadata } from "next";
import Link from "next/link";
import { school, admissionsSteps, tuition } from "@/lib/site";
import { startEnrollmentAction } from "@/lib/actions/enrollment";
import { PageHeader, Prose } from "@/app/components/ui/PageHeader";
import { Section, SectionHeading } from "@/app/components/ui/Section";
import { ProcessSteps } from "@/app/components/ui/ProcessSteps";
import { Callout } from "@/app/components/ui/Callout";
import { ExternalButtonLink } from "@/app/components/ui/Button";
import { SubmitButton } from "@/app/components/forms/SubmitButton";

export const metadata: Metadata = {
  title: "Application received",
  robots: { index: false, follow: false },
};

/**
 * Confirmation page.
 *
 * Deliberately carries NO student or family details — not in the body, not in the URL.
 * A confirmation URL ends up in browser history, in shared-screen screenshots, and in
 * any Referer header the page emits; a minor's name does not belong in any of them. The
 * family already knows what they submitted, and the emailed confirmation names the
 * student for their records.
 *
 * The sibling action exists because Document 9 requires one agreement per student, and a
 * family with three children would otherwise retype the same address three times. It
 * carries forward only guardian, address, and medical-provider details — never medical
 * history, never a signature, never a media-release choice, and never the funding election
 * (the Iowa ESA is a per-student account, so that decision is per-student).
 *
 * ⚠️  THE COPY BELOW IS A PROMISE ABOUT lib/enrollment/draft.ts → siblingSeed(). If that
 * list changes, this text changes in the same commit. It also names WHICH STEP the carried
 * values appear on, because the sibling flow lands on the student step — which shows none
 * of them — and a family seeing a blank first page reasonably concluded the carry-over was
 * broken. That report is Bug 2's visible half.
 */
export default async function EnrollmentSubmittedPage({
  searchParams,
}: PageProps<"/enroll/submitted">) {
  const { busy } = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Thank you"
        title="Your application is in"
        lead="We have your signed enrollment agreement on file. A confirmation is on its way to your email."
      />

      <Section width="narrow">
        <div className="rounded-2xl border border-line border-l-4 border-l-crest-green-600 bg-white p-7">
          <h2 className="font-serif text-xl font-bold text-navy-900">
            What happens next
          </h2>
          <div className="mt-6">
            <ProcessSteps steps={admissionsSteps.slice(1)} />
          </div>
        </div>

        <Prose className="mt-10">
          <p>
            Enrollment is confirmed once we have met and the first monthly
            contribution of ${tuition.monthlyContribution} is received. If you
            indicated Iowa ESA funding, that application goes directly to the Iowa
            Department of Education &mdash; tell us what documentation you need and we
            will provide it.
          </p>
          <p>
            Bring immunization records, or a valid exemption, to your intake meeting.
          </p>
        </Prose>

        <div className="mt-8">
          <Callout title="Didn't get the email?">
            Check your spam folder first. If it is not there, call{" "}
            <a href={school.phoneHref}>{school.phone}</a> &mdash; your application is
            safely on file either way, and a missing email does not affect it.
          </Callout>
        </div>
      </Section>

      <Section tone="muted" width="narrow">
        <SectionHeading
          eyebrow="Enrolling more than one child?"
          title="Add a sibling"
          lead="Each student needs their own agreement. We will carry over your contact details and doctor's information so you are not retyping them — everything specific to the child, including funding and the signature, starts fresh."
        />

        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          The first page asks about the new student, so it will look empty &mdash;
          your address, phone, emergency contact and doctor are already filled in on
          the <strong>parent / guardian</strong> and <strong>medical</strong> steps
          that follow. Please check them over before you sign.
        </p>

        {busy ? (
          <div className="mt-6">
            <Callout title="We could not start the next form just now">
              Our system has paused new forms from your connection for a few minutes.
              The agreement you just signed is safely on file. Try this button again
              shortly, or call <a href={school.phoneHref}>{school.phone}</a> and we
              will add your other child&rsquo;s details for you.
            </Callout>
          </div>
        ) : null}

        <form action={startEnrollmentAction.bind(null, true)} className="mt-6">
          <SubmitButton
            label="Start an agreement for another child"
            pendingLabel="Starting…"
            variant="primary"
          />
        </form>

        <p className="mt-8 text-sm leading-relaxed text-ink-subtle">
          Meanwhile, the{" "}
          <Link
            href="/handbook"
            className="font-medium text-navy-700 underline hover:text-navy-900"
          >
            Student &amp; Family Handbook
          </Link>{" "}
          covers day-to-day expectations, and{" "}
          <Link
            href="/curriculum"
            className="font-medium text-navy-700 underline hover:text-navy-900"
          >
            how instruction works
          </Link>{" "}
          explains what your student&rsquo;s week will look like.
        </p>

        <div className="mt-6">
          <ExternalButtonLink href={school.phoneHref} variant="outline">
            Call the school &mdash; {school.phone}
          </ExternalButtonLink>
        </div>
      </Section>
    </>
  );
}
