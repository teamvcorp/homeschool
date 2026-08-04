import type { ReactNode } from "react";
import { Eyebrow } from "./Section";

/**
 * Standard header band for interior pages. Carries the page's single <h1>.
 *
 * Every interior page uses this so heading hierarchy stays correct site-wide:
 * exactly one h1 per page, with Section/SectionHeading providing the h2s beneath.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  /** Optional CTA row or metadata rendered under the lead. */
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-line bg-navy-900">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex max-w-3xl flex-col gap-4">
          {eyebrow ? <Eyebrow onNavy>{eyebrow}</Eyebrow> : null}
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          {lead ? (
            <p className="text-lg leading-relaxed text-navy-100">{lead}</p>
          ) : null}
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
      </div>
    </header>
  );
}

/**
 * Long-form prose container. Applies readable measure and vertical rhythm to
 * runs of policy text — the Handbook and accreditation documents are mostly this.
 *
 * Uses Tailwind arbitrary-variant selectors rather than @tailwindcss/typography
 * to avoid adding a dependency for what amounts to a dozen declarations.
 */
export function Prose({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`max-w-3xl leading-relaxed text-ink-muted
        [&>*+*]:mt-4
        [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-navy-900
        [&_h3]:mt-8 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-navy-900
        [&_strong]:font-semibold [&_strong]:text-navy-900
        [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5
        [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5
        [&_a]:font-medium [&_a]:text-navy-700 [&_a]:underline hover:[&_a]:text-navy-900
        ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Definition list for the many label/value tables in the source documents
 * (institutional identity, head-of-school credentials, tuition lines).
 */
export function FactList({
  items,
}: {
  items: readonly { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
      {items.map((item) => (
        <div
          key={item.label}
          className="print-keep grid gap-1 px-5 py-4 sm:grid-cols-3 sm:gap-4"
        >
          <dt className="text-sm font-semibold text-navy-900">{item.label}</dt>
          <dd className="text-sm leading-relaxed text-ink-muted sm:col-span-2">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
