import { setLanguageAction } from "@/lib/actions/language";
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  type Locale,
} from "@/lib/i18n/locales";
import { translator } from "@/lib/i18n";

/**
 * Language switcher for the enrollment funnel.
 *
 * A SERVER COMPONENT, and a plain <form> with one submit button per language. No
 * "use client", no onChange, no JavaScript of any kind.
 *
 * WHY THAT MATTERS HERE SPECIFICALLY
 * The funnel is built to work with JavaScript disabled — that is the whole reason each
 * step is a real form POST. A language switcher that needed JS would fail for exactly the
 * visitors most likely to need it: someone on an old phone, a locked-down library
 * computer, or a slow connection where the bundle has not arrived yet.
 *
 * Rendering the CURRENT language as a disabled button rather than hiding it is deliberate:
 * the set of available languages should be visible at a glance, and a family should be able
 * to see that their choice took effect.
 *
 * `path` is echoed back through the action so the visitor returns to the step they were on
 * rather than the start of the wizard. It is validated server-side as a same-origin
 * enrollment path — see the open-redirect note in lib/actions/language.ts.
 */
export default function LanguageToggle({
  locale,
  path,
}: {
  locale: Locale;
  path: string;
}) {
  const tr = translator(locale);

  return (
    <form
      action={setLanguageAction}
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      <input type="hidden" name="returnTo" value={path} />

      {/*
        A <p> rather than a <label>: this labels a GROUP of buttons, and a label
        associated with nothing is worse for a screen reader than plain text next to a
        described group.
      */}
      <p
        id="language-toggle-label"
        className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle"
      >
        {tr("language.label")}
      </p>

      <div
        role="group"
        aria-labelledby="language-toggle-label"
        className="flex flex-wrap gap-1.5"
      >
        {SUPPORTED_LOCALES.map((candidate) => {
          const isCurrent = candidate === locale;
          return (
            <button
              key={candidate}
              type="submit"
              name="lang"
              value={candidate}
              // The current language is not a destination; pressing it would be a no-op
              // round-trip. Disabled, and announced as the current selection.
              disabled={isCurrent}
              aria-current={isCurrent ? "true" : undefined}
              /**
               * `lang` on each button so a screen reader pronounces "Español" and "ລາວ"
               * correctly, and so Lao renders with the Lao font rather than falling back
               * to a Latin face that has no Lao glyphs at all.
               */
              lang={candidate}
              className={
                isCurrent
                  ? "cursor-default rounded-full border border-navy-800 bg-navy-800 px-3 py-1 text-sm font-semibold text-white"
                  : "rounded-full border border-line px-3 py-1 text-sm font-medium text-ink-muted transition-colors hover:border-navy-300 hover:text-navy-900"
              }
            >
              {LOCALE_LABELS[candidate]}
            </button>
          );
        })}
      </div>
    </form>
  );
}
