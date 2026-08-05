import Link from "next/link";
import { dailyApp } from "@/lib/site";
import { ExternalButtonLink, ArrowIcon } from "../ui/Button";

/**
 * Sign-in signpost for families who are ALREADY enrolled.
 *
 * Placed directly below the hero rather than further down the page: an enrolled parent
 * checking their child in is a DAILY visitor, and making them scroll past the whole
 * prospective-family pitch every morning is the wrong trade. It is deliberately compact and
 * visually quieter than the enrollment CTA above it, so it signposts without competing.
 *
 * THE COPY IS THE FEATURE. Two distinct failure modes are being designed against:
 *
 *  1. A PROSPECTIVE family clicking "sign in" and hitting a login wall they have no account
 *     for — the worst possible answer to "I want to enroll my child". Hence the explicit
 *     "not enrolled yet?" escape hatch pointing back at enrollment.
 *
 *  2. An ENROLLED family confusing the two sign-ins this school now has. The school day app
 *     (app.vaschool.org) is for TODAY — check-in and the school day. The family portal here
 *     is for THE RECORD — attendance history, mastery, and their signed agreement. Both are
 *     named for what they do rather than what they are, because "portal" and "app" mean
 *     nothing to a parent at 7:40am.
 */
export default function CurrentFamilies() {
  return (
    <section
      aria-labelledby="current-families-heading"
      className="border-y border-navy-100 bg-navy-50"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-gold-700">
              Already enrolled?
            </p>
            <h2
              id="current-families-heading"
              className="mt-1 font-serif text-xl font-bold text-navy-900 sm:text-2xl"
            >
              Students and parents sign in here
            </h2>
            {/*
              Points enrolled families ENTIRELY at the School Day app, and promises nothing
              about this site.
              An earlier draft said records would "move here to the main site" — wrong, and
              the kind of wrong that becomes a support call. This site is the ENROLLMENT
              application; everything an already-enrolled family needs lives at
              app.vaschool.org. See the division of intent documented on `dailyApp` in
              lib/site.ts.
            */}
            <p className="mt-2 leading-relaxed text-ink-muted">
              Everything for enrolled families &mdash; daily check-in, the school day, and
              your student&rsquo;s progress &mdash; lives in the{" "}
              <strong className="text-navy-900">School Day app</strong>, using the same
              sign-in your student uses. This site is just for enrolling.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2">
            <ExternalButtonLink
              href={dailyApp.loginUrl}
              variant="primary"
              size="lg"
              newTab
            >
              Sign in to the School Day app
              <ArrowIcon />
            </ExternalButtonLink>
            {/* The escape hatch. A visitor who does not have an account must not be left
                staring at a login form wondering what they did wrong. */}
            <p className="text-xs text-ink-subtle">
              Not enrolled yet?{" "}
              <Link
                href="/enroll"
                className="font-medium text-navy-700 underline hover:text-navy-900"
              >
                Start an application instead
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
