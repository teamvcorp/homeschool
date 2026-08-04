import type { ReactNode } from "react";
import { categoryStyles, type CategoryColor } from "@/lib/site";

/**
 * Content card. `accent` ties the card to one of the crest's four quadrant hues
 * via a left border — used for cohorts, career pathways, and program areas.
 *
 * Accessibility: the accent color is never the only signal. Every card that uses
 * one also carries a text title, so the grouping survives grayscale printing and
 * colorblindness.
 */
export function Card({
  children,
  accent,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  accent?: CategoryColor;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const accentBorder = accent
    ? `border-l-4 ${categoryStyles[accent].border}`
    : "";

  return (
    <Tag
      className={`rounded-2xl border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-lg ${accentBorder} ${className}`}
    >
      {children}
    </Tag>
  );
}

export function CardTitle({
  children,
  accent,
}: {
  children: ReactNode;
  accent?: CategoryColor;
}) {
  return (
    <h3
      className={`font-serif text-xl font-bold ${
        accent ? categoryStyles[accent].text : "text-navy-900"
      }`}
    >
      {children}
    </h3>
  );
}

export function CardBody({ children }: { children: ReactNode }) {
  return <p className="mt-2 leading-relaxed text-ink-muted">{children}</p>;
}

/**
 * Responsive card grid. Renders as a <ul> because these are lists of things —
 * screen readers announce the item count, which a stack of <div>s never does.
 */
export function CardGrid({
  children,
  columns = 3,
  className = "",
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  } as const;

  return (
    <ul className={`grid list-none grid-cols-1 gap-6 ${cols[columns]} ${className}`}>
      {children}
    </ul>
  );
}
