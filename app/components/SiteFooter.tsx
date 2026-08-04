import Link from "next/link";
import { school, addressLine, footerNav, yearsInOperation } from "@/lib/site";
import { Wordmark } from "./ui/Crest";
import { ButtonLink, ArrowIcon } from "./ui/Button";

/**
 * Site footer. A Server Component — nothing here is interactive, so none of it
 * needs to ship as JavaScript.
 *
 * The nav list comes from lib/site.ts rather than being retyped here. The
 * previous version of this file duplicated the header's link array, which is
 * exactly how the two fall out of sync.
 */
export default function SiteFooter() {
  return (
    <footer className="no-print mt-auto bg-navy-950 text-navy-200">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Identity */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Wordmark onNavy size={44} />
            <p className="mt-4 text-sm leading-relaxed text-navy-300">
              {school.legalName}
              <br />
              {school.legalStatus}
            </p>
            <p className="mt-3 text-sm italic leading-relaxed text-gold-300">
              &ldquo;{school.tagline}&rdquo;
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-gold-300">
              Explore
            </h2>
            <ul className="mt-4 list-none space-y-2.5">
              {footerNav.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-navy-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-gold-300">
              Visit &amp; Contact
            </h2>
            <address className="mt-4 not-italic">
              <p className="text-sm leading-relaxed text-navy-300">
                {school.address.street}
                <br />
                {school.address.city}, {school.address.state} {school.address.zip}
                <br />
                <span className="text-navy-400">{school.address.county}</span>
              </p>
              <ul className="mt-3 list-none space-y-2">
                <li>
                  <a
                    href={school.phoneHref}
                    className="text-sm text-navy-300 transition-colors hover:text-white"
                  >
                    {school.phone}
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${school.email}`}
                    className="break-all text-sm text-navy-300 transition-colors hover:text-white"
                  >
                    {school.email}
                  </a>
                </li>
              </ul>
            </address>
          </div>

          {/* Enrollment */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-gold-300">
              Enrollment
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-navy-300">
              Now accepting applications for all cohorts, Kindergarten through
              Grade 12.
            </p>
            <ButtonLink
              href="/enroll"
              variant="gold"
              size="sm"
              className="mt-4"
            >
              Begin enrollment
              <ArrowIcon />
            </ButtonLink>
            <p className="mt-4 text-xs leading-relaxed text-navy-400">
              Iowa ESA funding accepted.{" "}
              <Link href="/tuition" className="underline hover:text-navy-200">
                See tuition
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-navy-800 pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-navy-400">
            &copy; {new Date().getFullYear()} {school.legalName}. All rights
            reserved.
          </p>
          <p className="text-xs text-navy-500">
            Serving {school.address.city}, Iowa since {school.established} &middot;{" "}
            {yearsInOperation()} years of continuous operation
          </p>
        </div>

        {/* Screen-reader-only full address for parity with the JSON-LD. */}
        <p className="sr-only">{addressLine}</p>
      </div>
    </footer>
  );
}
