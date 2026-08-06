import { ENROLLMENT_STEPS, type StepSlug } from "@/lib/validation/enrollment";
import { translator, type MessageKey } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Wizard progress.
 *
 * Renders an ordered list with `aria-current="step"` on the active item, so a screen
 * reader announces position rather than leaving it as a purely visual cue. The
 * "Step N of M" line is also stated in text for the same reason — a row of coloured
 * dots communicates nothing without sight.
 *
 * Step names come from the message catalogue rather than from `ENROLLMENT_STEPS[].title`.
 * That array is the validation registry: its slugs are route segments and its schemas are
 * the server's source of truth, so it stays in one language. The slugs line up with
 * `funnel.step.<slug>` keys.
 *
 * The screen-reader status suffixes are translated too. They are the only part of this
 * component a non-sighted family actually receives, so leaving them in English would make
 * the progress indicator useless in exactly the case where it matters most.
 */
export function StepIndicator({
  current,
  locale,
}: {
  current: StepSlug;
  locale: Locale;
}) {
  const tr = translator(locale);
  const index = ENROLLMENT_STEPS.findIndex((s) => s.slug === current);
  const total = ENROLLMENT_STEPS.length;

  const stepTitle = (slug: StepSlug) => tr(`funnel.step.${slug}` as MessageKey);

  return (
    <nav aria-label={tr("funnel.progress.label")} className="flex flex-col gap-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-gold-600">
        {tr("funnel.progress.position", { current: index + 1, total })} &middot;{" "}
        {ENROLLMENT_STEPS[index] ? stepTitle(ENROLLMENT_STEPS[index].slug) : ""}
      </p>

      <ol className="flex list-none flex-wrap gap-1.5">
        {ENROLLMENT_STEPS.map((step, i) => {
          const state =
            i < index ? "done" : i === index ? "current" : "upcoming";
          return (
            <li
              key={step.slug}
              aria-current={state === "current" ? "step" : undefined}
              className={`h-1.5 flex-1 rounded-full ${
                state === "done"
                  ? "bg-gold-400"
                  : state === "current"
                    ? "bg-navy-800"
                    : "bg-navy-100"
              }`}
            >
              <span className="sr-only">
                {stepTitle(step.slug)}
                {state === "done"
                  ? ` — ${tr("funnel.progress.done")}`
                  : state === "current"
                    ? ` — ${tr("funnel.progress.current")}`
                    : ` — ${tr("funnel.progress.upcoming")}`}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
