import { ENROLLMENT_STEPS, type StepSlug } from "@/lib/validation/enrollment";

/**
 * Wizard progress.
 *
 * Renders an ordered list with `aria-current="step"` on the active item, so a screen
 * reader announces position rather than leaving it as a purely visual cue. The
 * "Step N of M" line is also stated in text for the same reason — a row of coloured
 * dots communicates nothing without sight.
 */
export function StepIndicator({ current }: { current: StepSlug }) {
  const index = ENROLLMENT_STEPS.findIndex((s) => s.slug === current);
  const total = ENROLLMENT_STEPS.length;

  return (
    <nav aria-label="Enrollment progress" className="flex flex-col gap-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-gold-600">
        Step {index + 1} of {total} &middot;{" "}
        {ENROLLMENT_STEPS[index]?.title ?? ""}
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
                {step.title}
                {state === "done"
                  ? " — completed"
                  : state === "current"
                    ? " — current step"
                    : " — not started"}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
