import { ButtonLink, ExternalButtonLink, ArrowIcon } from "./Button";
import { school } from "@/lib/site";

/**
 * Closing call-to-action band. Appears at the foot of most public pages so the
 * enrollment path is never more than one screen away.
 *
 * Copy is deliberately not generic marketing filler — it restates the school's
 * actual position (an earned standard, not an easy one), which is the thing that
 * self-selects the families this model works for.
 */
export function CTABand({
  title = "Ready to raise the bar?",
  lead = "Enrollment is open. Start with the application, then meet with the Head of School — we will tell you honestly whether this is the right fit for your student.",
  primaryLabel = "Begin enrollment",
}: {
  title?: string;
  lead?: string;
  primaryLabel?: string;
}) {
  return (
    <section className="no-print bg-navy-900">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-navy-100">{lead}</p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <ButtonLink href="/enroll" variant="gold" size="lg">
              {primaryLabel}
              <ArrowIcon />
            </ButtonLink>
            <ExternalButtonLink
              href={school.phoneHref}
              variant="ghostOnNavy"
              size="lg"
            >
              {school.phone}
            </ExternalButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
