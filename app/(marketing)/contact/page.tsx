import type { Metadata, Route } from "next";
import { school, addressLine } from "@/lib/site";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Section, SectionHeading } from "@/app/components/ui/Section";
import { Callout } from "@/app/components/ui/Callout";
import {
  ButtonLink,
  ExternalButtonLink,
  ArrowIcon,
} from "@/app/components/ui/Button";
import ImagePlaceholder from "@/app/components/ImagePlaceholder";

export const metadata: Metadata = {
  title: "Contact & Visit",
  description: `Visit The VA School at ${addressLine}. Call ${school.phone} or email ${school.email} to arrange an intake meeting or a tour.`,
};

/**
 * One card in the "get in touch" list. A discriminated union on `internal`:
 * internal destinations are route-checked by `typedRoutes`, external ones
 * (mailto:, tel:) are opaque strings and render as a plain anchor.
 */
type ContactAction =
  | { title: string; body: string; label: string; internal: true; href: Route }
  | { title: string; body: string; label: string; internal: false; href: string };

export default function ContactPage() {
  const mapQuery = encodeURIComponent(addressLine);

  return (
    <>
      <PageHeader
        eyebrow="Contact &amp; visit"
        title="Come see it in person"
        lead="The fastest way to understand this school is to stand in it during a school day. Call or email and we will arrange a time."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Contact details */}
          <div>
            <SectionHeading eyebrow="Reach us" title="Contact information" />

            <dl className="mt-8 flex flex-col gap-6">
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
                  Address
                </dt>
                <dd className="mt-2">
                  <address className="not-italic leading-relaxed text-ink">
                    {school.legalName}
                    <br />
                    {school.address.street}
                    <br />
                    {school.address.city}, {school.address.state}{" "}
                    {school.address.zip}
                    <br />
                    <span className="text-ink-subtle">
                      {school.address.county}
                    </span>
                  </address>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-navy-700 underline hover:text-navy-900"
                  >
                    Open in Maps
                    <ArrowIcon className="h-3.5 w-3.5" />
                  </a>
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
                  Phone
                </dt>
                <dd className="mt-2">
                  <a
                    href={school.phoneHref}
                    className="text-lg font-semibold text-navy-900 hover:text-navy-700"
                  >
                    {school.phone}
                  </a>
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
                  Email
                </dt>
                <dd className="mt-2">
                  <a
                    href={`mailto:${school.email}`}
                    className="break-all text-lg font-semibold text-navy-900 hover:text-navy-700"
                  >
                    {school.email}
                  </a>
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
                  School days
                </dt>
                <dd className="mt-2 leading-relaxed text-ink-muted">
                  Monday through Thursday, year-round.
                  <br />
                  <span className="text-sm text-ink-subtle">
                    Current daily hours and break schedule provided on request.
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
                  Head of School
                </dt>
                <dd className="mt-2 leading-relaxed text-ink-muted">
                  {school.headOfSchool}
                </dd>
              </div>
            </dl>
          </div>

          {/* Reasons to reach out */}
          <div>
            <SectionHeading eyebrow="What can we help with?" title="Get in touch" />

            <div className="mt-8 flex flex-col gap-4">
              {/*
                Explicitly typed as a discriminated union. `typedRoutes` makes
                internal hrefs a checked route union while mailto: links are plain
                strings, so a single array of mixed hrefs would widen both to
                `string` and fail to typecheck.
              */}
              {(
                [
                  {
                    title: "Enroll a student",
                    body: "Start the application online. It takes about fifteen minutes and includes the Iowa ESA election.",
                    href: "/enroll",
                    label: "Begin enrollment",
                    internal: true,
                  },
                {
                  title: "Request an intake meeting or tour",
                  body: "Step two of admissions — and the right place to ask every hard question you have.",
                  href: `mailto:${school.email}?subject=Intake%20meeting%20%2F%20tour%20request`,
                  label: "Request a visit",
                  internal: false,
                },
                {
                  title: "Teach or volunteer with us",
                  body: "We are actively recruiting instructors and parent volunteers.",
                  href: `mailto:${school.email}?subject=Instructor%20%2F%20volunteer%20inquiry`,
                  label: "Inquire about a role",
                  internal: false,
                },
                  {
                    title: "Host a Higher Institute placement",
                    body: "Employers in health sciences, technology, engineering, and the trades: we would like to talk.",
                    href: `mailto:${school.email}?subject=Higher%20Institute%20employer%20partnership`,
                    label: "Discuss a partnership",
                    internal: false,
                  },
                ] as ContactAction[]
              ).map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-line bg-white p-6"
                >
                  <h3 className="font-serif text-lg font-bold text-navy-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 leading-relaxed text-ink-muted">
                    {item.body}
                  </p>
                  <div className="mt-4">
                    {item.internal ? (
                      <ButtonLink href={item.href} variant="gold" size="sm">
                        {item.label}
                        <ArrowIcon />
                      </ButtonLink>
                    ) : (
                      <ExternalButtonLink
                        href={item.href}
                        variant="outline"
                        size="sm"
                      >
                        {item.label}
                      </ExternalButtonLink>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section tone="muted">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <ImagePlaceholder
            src="/transparency-community-meeting.png"
            alt="Families and instructors meeting together at The VA School"
            aspectRatio="aspect-[4/3]"
            sizes="(max-width: 1024px) 100vw, 550px"
          />
          <div>
            <SectionHeading
              eyebrow="Our commitment"
              title="Ask us anything, including the uncomfortable questions"
            />
            <p className="mt-6 leading-relaxed text-ink-muted">
              We publish our full accreditation submission, our handbook, and our
              instructional model openly because a school asking families to trust
              it with their children should be willing to show its work.
            </p>
            <div className="mt-6">
              <Callout title="A note on records">
                Student records are confidential and accessible to the
                student&rsquo;s family at any time on request. Records are retained
                for a minimum of seven years after a student leaves the school.
              </Callout>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
