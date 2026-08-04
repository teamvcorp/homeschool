import type { Metadata } from "next";
import Link from "next/link";
import { school, addressLine, yearsInOperation } from "@/lib/site";
import { accreditationDocs } from "@/lib/content/accreditation";

export const metadata: Metadata = {
  title: "Accreditation Packet",
  description: `The complete Iowa Department of Education nonpublic school accreditation submission for ${school.legalName} — nine documents plus the application narrative, published openly.`,
};

/**
 * Index of the accreditation packet.
 *
 * Published openly and deliberately. A school asking families to trust it with
 * their children should be willing to show exactly what it told the state.
 */
export default function AccreditationIndexPage() {
  return (
    <>
      <h1 className="font-serif text-3xl font-bold leading-tight text-navy-900">
        Complete Accreditation &amp; Program Document Package
      </h1>
      <p className="mt-3 text-sm italic leading-relaxed text-ink-muted">
        Iowa Department of Education &mdash; Nonpublic School Accreditation
        Application, prepared under Iowa Code Chapter 256.
      </p>

      <div className="mt-8 rounded-xl border border-navy-200 bg-navy-50 p-5">
        <p className="leading-relaxed text-ink">
          This is the full submission for {school.legalName}, operating as{" "}
          {school.dbaName}, at {addressLine} &mdash; a {school.legalStatus} serving
          Iowa families for {yearsInOperation()} consecutive years.
        </p>
        <p className="mt-3 leading-relaxed text-ink">
          Every document is linkable and prints cleanly. Reviewers are welcome to
          print or save any individual document as a PDF using the control at the
          top of each page.
        </p>
      </div>

      <h2 className="mt-10 font-serif text-xl font-bold text-navy-900">
        Documents in this package
      </h2>

      <ol className="mt-4 flex list-none flex-col divide-y divide-line border-y border-line">
        {accreditationDocs.map((doc) => (
          <li key={doc.slug}>
            <Link
              href={`/accreditation/${doc.slug}`}
              className="group flex items-baseline gap-4 py-4 transition-colors hover:bg-navy-50"
            >
              <span className="w-24 shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-gold-600">
                {doc.n === null ? "Bonus" : `Doc ${doc.n}`}
              </span>
              <span className="flex-1 font-medium text-navy-900 group-hover:underline">
                {doc.title}
              </span>
              <svg
                className="h-4 w-4 shrink-0 text-ink-subtle"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </li>
        ))}
      </ol>

      <div className="no-print mt-10 rounded-xl border-l-4 border-gold-400 bg-gold-50 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-gold-800">
          For families
        </p>
        <p className="mt-2 leading-relaxed text-ink">
          These are formal regulatory documents. If you are a parent deciding
          whether this school is right for your student, the{" "}
          <Link
            href="/handbook"
            className="font-medium text-navy-700 underline hover:text-navy-900"
          >
            Student &amp; Family Handbook
          </Link>{" "}
          and{" "}
          <Link
            href="/curriculum"
            className="font-medium text-navy-700 underline hover:text-navy-900"
          >
            curriculum overview
          </Link>{" "}
          cover the same ground in plainer language.
        </p>
      </div>
    </>
  );
}
