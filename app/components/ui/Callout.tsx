import type { ReactNode } from "react";

/**
 * Highlighted aside. `statute` is the variant for the Iowa Code citations that
 * run through the accreditation package — those notes carry legal weight and
 * should look deliberate rather than like decorative marketing copy.
 */
export function Callout({
  title,
  children,
  variant = "info",
}: {
  title?: string;
  children: ReactNode;
  variant?: "info" | "statute" | "emphasis";
}) {
  const styles = {
    info: {
      wrap: "border-navy-200 bg-navy-50",
      title: "text-navy-800",
      body: "text-ink-muted",
    },
    /** Gold rail — reads as a legal/reference note. */
    statute: {
      wrap: "border-l-4 border-gold-400 bg-gold-50",
      title: "text-gold-800",
      body: "text-ink-muted",
    },
    /** Navy block for mission statements and the things worth stopping on. */
    emphasis: {
      wrap: "border-navy-700 bg-navy-900",
      title: "text-gold-300",
      body: "text-navy-100",
    },
  } as const;

  const s = styles[variant];

  return (
    // print-keep stops a callout splitting across a page break in the PDF export.
    <aside className={`print-keep rounded-xl border p-5 ${s.wrap}`}>
      {title ? (
        <p
          className={`text-xs font-bold uppercase tracking-[0.12em] ${s.title}`}
        >
          {title}
        </p>
      ) : null}
      <div
        className={`${title ? "mt-2" : ""} leading-relaxed ${s.body} [&_a]:underline`}
      >
        {children}
      </div>
    </aside>
  );
}

/**
 * Pull quote for the mission and vision statements — the two pieces of copy the
 * school leads with everywhere.
 */
export function Statement({
  children,
  attribution,
}: {
  children: ReactNode;
  attribution?: string;
}) {
  return (
    <blockquote className="print-keep border-l-4 border-gold-400 bg-navy-50 py-6 pl-6 pr-5">
      <p className="font-serif text-xl leading-relaxed text-navy-900 sm:text-2xl">
        {children}
      </p>
      {attribution ? (
        <footer className="mt-3 text-sm font-medium text-ink-subtle">
          — {attribution}
        </footer>
      ) : null}
    </blockquote>
  );
}
