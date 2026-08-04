import type { ReactNode } from "react";

/**
 * Page section wrapper. Owns the site's vertical rhythm and horizontal gutter so
 * no page has to remember `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` again.
 *
 * `id` is what in-page anchors target; globals.css sets scroll-padding-top so
 * the fixed header doesn't cover the heading on jump.
 */
export function Section({
  children,
  id,
  className = "",
  tone = "default",
  width = "wide",
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  /** Background treatment. `navy` flips content to light-on-dark. */
  tone?: "default" | "muted" | "navy";
  width?: "wide" | "narrow";
}) {
  const tones = {
    default: "bg-surface",
    muted: "bg-surface-muted",
    navy: "bg-navy-900 text-navy-100",
  } as const;

  const widths = {
    wide: "max-w-7xl",
    /** Narrow is a readable measure for long-form policy prose. */
    narrow: "max-w-3xl",
  } as const;

  return (
    <section id={id} className={`${tones[tone]} py-16 sm:py-24 ${className}`}>
      <div className={`${widths[width]} mx-auto px-4 sm:px-6 lg:px-8`}>
        {children}
      </div>
    </section>
  );
}

/**
 * The small uppercase label above a heading. Gold on light, gold-300 on navy —
 * gold-600 is the lightest gold that clears AA on white, so don't swap it for a
 * lighter step without re-checking contrast.
 */
export function Eyebrow({
  children,
  onNavy = false,
}: {
  children: ReactNode;
  onNavy?: boolean;
}) {
  return (
    <p
      className={`text-xs font-bold uppercase tracking-[0.15em] ${
        onNavy ? "text-gold-300" : "text-gold-600"
      }`}
    >
      {children}
    </p>
  );
}

/**
 * Standard section heading block: eyebrow, h2, and an optional lead paragraph.
 * `align="center"` for marketing sections, left for document-style pages.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  onNavy = false,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  align?: "left" | "center";
  onNavy?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-4 ${
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"
      }`}
    >
      {eyebrow ? <Eyebrow onNavy={onNavy}>{eyebrow}</Eyebrow> : null}
      <h2
        className={`text-3xl font-bold tracking-tight sm:text-4xl ${
          onNavy ? "text-white" : "text-navy-900"
        }`}
      >
        {title}
      </h2>
      {lead ? (
        <p
          className={`text-lg leading-relaxed ${
            onNavy ? "text-navy-100" : "text-ink-muted"
          }`}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
