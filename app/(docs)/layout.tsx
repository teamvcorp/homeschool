import Link from "next/link";
import { school, addressLine } from "@/lib/site";
import { Crest } from "@/app/components/ui/Crest";
import PrintButton from "@/app/components/PrintButton";

/**
 * Layout for the accreditation packet.
 *
 * Deliberately NOT the marketing chrome. These pages exist to be read and printed
 * by an Iowa Department of Education reviewer, so they present as documents:
 * letterhead, a readable measure, and a document footer — no site nav, no
 * marketing CTAs, nothing that says "brochure".
 *
 * Everything marked `no-print` disappears in the printed output (see the
 * @media print block in globals.css). What remains is the letterhead, the
 * content, and the footer.
 */
export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-surface-muted">
      {/* Return link — screen only. */}
      <div className="no-print border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/accreditation"
            className="inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-navy-900"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 17l-5-5m0 0l5-5m-5 5h12"
              />
            </svg>
            Accreditation packet
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-ink-subtle hover:text-navy-900"
            >
              Main site
            </Link>
            <PrintButton />
          </div>
        </div>
      </div>

      <main id="main" className="flex-1">
        <div className="mx-auto max-w-4xl bg-white px-6 py-10 shadow-sm sm:px-12 sm:py-14">
          {/* Letterhead — printed on every page's first sheet. */}
          <header className="print-keep mb-10 border-b-2 border-navy-800 pb-6">
            <div className="flex items-start gap-4">
              <Crest size={56} eager />
              <div>
                <p className="font-serif text-xl font-bold leading-tight text-navy-900">
                  {school.legalName}
                </p>
                <p className="font-serif text-base text-gold-700">
                  {school.dbaName}
                </p>
                <p className="mt-1 text-xs italic text-ink-subtle">
                  {school.tagline}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-subtle">
              {addressLine} &middot; {school.phone} &middot; {school.email}
            </p>
          </header>

          {children}

          {/* Document footer */}
          <footer className="print-keep mt-16 border-t border-line pt-6">
            <p className="text-xs leading-relaxed text-ink-subtle">
              {school.legalName} ({school.dbaName}) &middot; Prepared for the Iowa
              Department of Education Nonpublic School Accreditation Application
              under Iowa Code Chapter 256.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
              Statutory references in this package are provided for context and
              should be verified with qualified Iowa education counsel before
              filing.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
