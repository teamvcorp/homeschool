import type { ReactNode } from "react";

/**
 * Numbered process list. Used for the four-step admissions process, the five-step
 * behavioral response, and the three-phase Whole-Part-Whole cycle.
 *
 * Renders a real <ol> so the sequence is conveyed to assistive tech rather than
 * being implied by visual numbering alone. The numeral circles are decorative
 * duplicates and hidden accordingly.
 */
export function ProcessSteps({
  steps,
  variant = "numbered",
}: {
  steps: readonly { title: string; detail?: ReactNode }[];
  /** `numbered` shows 1-2-3 circles; `phased` shows a short label instead. */
  variant?: "numbered" | "phased";
}) {
  return (
    <ol className="flex list-none flex-col gap-5">
      {steps.map((step, i) => (
        <li key={step.title + i} className="flex gap-4">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-800 font-serif text-sm font-bold text-gold-300"
          >
            {variant === "numbered" ? i + 1 : i + 1}
          </span>
          <div className="pt-1">
            <h3 className="font-serif text-lg font-bold text-navy-900">
              {step.title}
            </h3>
            {step.detail ? (
              <p className="mt-1 leading-relaxed text-ink-muted">{step.detail}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * The Whole-Part-Whole cycle. Distinct from ProcessSteps because each phase has
 * both a description and a separate stated purpose, and the WHOLE/PART/WHOLE
 * labels repeat — numbering them 1-2-3 would obscure that the cycle returns to
 * where it started.
 */
export function CycleSteps({
  phases,
}: {
  phases: readonly {
    phase: string;
    label: string;
    description: string;
    purpose: string;
  }[];
}) {
  return (
    <ol className="flex list-none flex-col gap-4">
      {phases.map((p, i) => (
        <li
          key={i}
          className="print-keep rounded-2xl border border-line bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-navy-800 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-gold-300">
              {p.phase}
            </span>
            <h3 className="font-serif text-lg font-bold text-navy-900">
              {p.label}
            </h3>
          </div>
          <p className="mt-3 leading-relaxed text-ink-muted">{p.description}</p>
          <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-ink-subtle">
            <span className="font-semibold text-gold-700">Purpose: </span>
            {p.purpose}
          </p>
        </li>
      ))}
    </ol>
  );
}
