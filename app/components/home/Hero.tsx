import { school, yearsInStormLake } from "@/lib/site";
import ImagePlaceholder from "../ImagePlaceholder";
import { ButtonLink, ExternalButtonLink, ArrowIcon } from "../ui/Button";
import { Eyebrow } from "../ui/Section";

/**
 * Home hero. Leads with the tagline rather than a generic value proposition —
 * "We don't lower the bar. We raise the student." is the school's actual
 * positioning and it self-selects the families this model fits.
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-50 via-white to-white pb-20 pt-14 sm:pb-28 sm:pt-20">
      {/* Decorative wash. aria-hidden via being purely presentational divs. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 -z-10 h-[500px] w-[500px] rounded-full bg-gold-100/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 -z-10 h-[400px] w-[400px] rounded-full bg-navy-100/60 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <Eyebrow>
              {school.legalName} &middot; Storm Lake, Iowa
            </Eyebrow>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
              We don&rsquo;t lower the bar.
              <br />
              <span className="text-gold-600">We raise the student.</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-ink-muted sm:text-xl">
              A K&ndash;12 school where students advance when they have proven
              mastery &mdash; not when a calendar says so. Individualized
              instruction, character taught as coursework, and a Taekwondo
              discipline framework that makes every standard something earned.
            </p>

            <div className="mt-2 flex flex-col items-start gap-4 sm:flex-row">
              <ButtonLink href="/enroll" variant="gold" size="lg">
                Begin enrollment
                <ArrowIcon />
              </ButtonLink>
              <ExternalButtonLink
                href={school.phoneHref}
                variant="outline"
                size="lg"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                    clipRule="evenodd"
                  />
                </svg>
                {school.phone}
              </ExternalButtonLink>
            </div>

            {/* Credibility strip — facts, not adjectives. */}
            <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-6">
              {/*
                THE IOWA FIGURES, not the corporation's. A hero that reads
                "Established 2012 / Years running 14" above a Storm Lake address claims
                fourteen years in Iowa. The school has been here since 2019; the 2012
                founding was in Florida, and that fuller history belongs on /about where
                there is room to state it accurately.
              */}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-ink-subtle">
                  In Storm Lake since
                </dt>
                <dd className="mt-1 font-serif text-2xl font-bold text-navy-900">
                  {school.inStormLakeSince}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-ink-subtle">
                  Years here
                </dt>
                <dd className="mt-1 font-serif text-2xl font-bold text-navy-900">
                  {yearsInStormLake()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-ink-subtle">
                  Grades
                </dt>
                <dd className="mt-1 font-serif text-2xl font-bold text-navy-900">
                  K&ndash;12
                </dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            {/* The one and only `preload` on the site: this is the LCP candidate.
                Adding a second would make both slower. */}
            <ImagePlaceholder
              src="/hero-students.png"
              alt="Students working with an instructor in a small-group learning environment at The VA School"
              className="shadow-2xl shadow-navy-200/60"
              aspectRatio="aspect-[4/3]"
              sizes="(max-width: 1024px) 100vw, 600px"
              preload
            />
            <div className="absolute -bottom-5 -left-5 rounded-xl border border-line bg-white px-5 py-3 shadow-lg">
              <p className="font-serif text-2xl font-bold text-navy-900">
                Mastery
              </p>
              <p className="text-xs font-medium text-ink-subtle">
                not seat time
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
