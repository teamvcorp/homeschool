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
import LanguageToggle from "@/app/components/forms/LanguageToggle";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Enroll",
  description: `Begin enrollment at The VA School. ${tuition.monthlyContributionLabel}, with Iowa ESA funding accepted.`,
};

/**
 * Enrollment entry point — the start of the Family Enrollment Agreement (Document 9).
 *
 * The "Begin" control is a <form> posting a Server Action rather than a link, because
 * starting an agreement has a side effect: it creates a draft record and sets a signed
 * httpOnly cookie. A GET link cannot set a cookie, and making it one would mean a
 * crawler or a prefetch could create draft records.
 *
 * The preparation checklist is deliberately the field inventory of the wizard. Someone
 * who has to abandon the form to hunt for a doctor's phone number often does not come
 * back.
 *
 * `?busy=1` is set by startEnrollmentAction when the draft-creation rate limit rejects a
 * click. Reading searchParams opts this page into dynamic rendering, which is an acceptable
 * cost: without it the action could only redirect here silently, and the "Begin enrollment"
 * button simply looked dead — every further click burning another slot, so it could never
 * recover. A visible explanation with a phone number is the whole point.
 */
export default async function EnrollPage({ searchParams }: PageProps<"/enroll">) {
  const { busy } = await searchParams;
  const locale = await getLocale();

  return (
    <>
      <PageHeader
        eyebrow="Enrollment"
        title="Begin enrollment"
        lead="One agreement per student. About fifteen minutes, and your progress saves as you go."
      />

      {/*
        Language choice offered BEFORE the family commits to anything. Placed at the top of
        the first page of the funnel on purpose: discovering the switch on step four, having
        already struggled through three steps, is worse than not offering it.
      */}
      {/*
        A plain container rather than <Section>: Section bakes in py-16/sm:py-24, and
        appending a smaller py-* through className would not reliably win — class order in
        the attribute does not decide CSS specificity, source order in the stylesheet does.
      */}
      <div className="border-b border-line bg-surface-muted">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
          <LanguageToggle locale={locale} path="/enroll" />
        </div>
      </div>

      <Section>
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-3">
            <SectionHeading
              eyebrow="Ready when you are"
              title="Start the Family Enrollment Agreement"
            />

            <Prose className="mt-6">
              <p>
                You will be asked about your student, your family&rsquo;s contact
                details, how tuition will be funded, medical basics, and eight
                program acknowledgments &mdash; then you will sign electronically.
              </p>
              <p>
                Nothing is submitted until the final step, and you can go back and
                change any answer before signing.
              </p>
            </Prose>

            {busy ? (
              <div className="mt-7">
                <Callout title="We could not start a new form just now">
                  Our system has seen an unusual number of new forms from your
                  internet connection in the last hour, so it has paused briefly.
                  Nothing you have already submitted is affected. Please try again
                  in a few minutes, or call{" "}
                  <a href={school.phoneHref}>{school.phone}</a> and the Head of
                  School will take your details directly &mdash; that always works.
                </Callout>
              </div>
            ) : null}

            {/* .bind fixes the leading `sibling` argument; React then passes FormData
                as the next argument, which this action ignores. */}
            <form action={startEnrollmentAction.bind(null, false)} className="mt-7">
              <SubmitButton label="Begin enrollment" pendingLabel="Starting…" />
            </form>

            <div className="mt-12">
              <h2 className="font-serif text-xl font-bold text-navy-900">
                What happens after you submit
              </h2>
              <div className="mt-6">
                <ProcessSteps steps={admissionsSteps} />
              </div>
            </div>

            <div className="mt-10">
              <Callout title="Prefer to do this in person or by phone?">
                Call <a href={school.phoneHref}>{school.phone}</a> or email{" "}
                <a href={`mailto:${school.email}`}>{school.email}</a> and the Head of
                School will take your details directly. The online form is a
                convenience, not a requirement.
              </Callout>
            </div>
          </div>

          {/* Preparation checklist */}
          <aside className="lg:col-span-2">
            <div className="rounded-2xl border border-line bg-surface-muted p-7">
              <h2 className="font-serif text-lg font-bold text-navy-900">
                What you will need
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Gathering these first makes the whole thing quick.
              </p>

              <dl className="mt-6 flex flex-col gap-5 text-sm">
                {[
                  {
                    label: "Student",
                    items: [
                      "Legal name and date of birth",
                      "Current or intended grade level",
                      "Intended start date",
                    ],
                  },
                  {
                    label: "Parent / guardian",
                    items: [
                      "Name(s), address, phone, email",
                      "An emergency contact and phone",
                    ],
                  },
                  {
                    label: "Funding",
                    items: [
                      "Whether you intend to apply for Iowa ESA funding, pay directly, or request hardship consideration",
                    ],
                  },
                  {
                    label: "Medical",
                    items: [
                      "Known conditions or allergies",
                      "Current medications",
                      "Doctor or clinic name and phone",
                    ],
                  },
                ].map((group) => (
                  <div key={group.label}>
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-gold-700">
                      {group.label}
                    </dt>
                    <dd className="mt-1.5">
                      <ul className="flex list-disc flex-col gap-1 pl-4 leading-relaxed text-ink-muted">
                        {group.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-6">
              <Callout title="Immunization paperwork" variant="statute">
                Iowa law requires documentation of either immunization compliance or a
                valid exemption. Bring it to your intake meeting &mdash; there is
                nothing to upload here, and we do not ask you to email medical records.
              </Callout>
            </div>
          </aside>
        </div>
      </Section>

      <Section tone="muted" width="narrow">
        <SectionHeading
          eyebrow="Before you sign"
          title="Read the handbook first"
          lead="The agreement asks you to affirm eight specific commitments. None are boilerplate, and all of them are things families occasionally decide they do not want."
        />
        <Prose className="mt-6">
          <p>
            Taekwondo is required. Progression is earned rather than scheduled.
            Graduation is not conferred by age. Families are expected to communicate.
          </p>
          <p>
            All of it is spelled out in the{" "}
            <Link href="/handbook">Student &amp; Family Handbook</Link>.
          </p>
        </Prose>
        <div className="mt-6">
          <ExternalButtonLink href={`mailto:${school.email}`} variant="outline">
            Ask a question first
          </ExternalButtonLink>
        </div>
      </Section>
    </>
  );
}
