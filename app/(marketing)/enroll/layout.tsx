import { getLocale } from "@/lib/i18n/server";
import { LOCALE_HTML_LANG } from "@/lib/i18n/locales";

/**
 * Enrollment funnel layout.
 *
 * Exists for one job: put the visitor's language on a wrapper element so that everything
 * inside inherits the right `lang`. That single attribute is doing three things —
 * screen-reader pronunciation, Lao font selection (see the `[lang="lo"]` rule in
 * globals.css), and Lao line breaking, since Lao does not put spaces between words.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY NOT SET `lang` ON <html> IN THE ROOT LAYOUT
 *
 * Because app/layout.tsx is shared with the marketing pages, which are statically
 * prerendered — 18 of them, shown as `○` in the build output. Reading a cookie there makes
 * the root layout dynamic, and every page beneath it flips to `ƒ`, server-rendered on
 * demand. That would trade the whole site's static delivery for an attribute.
 *
 * The funnel is already dynamic (it reads the draft cookie on every step), so reading one
 * more cookie here costs nothing. `npm run build` is the regression test: if the marketing
 * routes ever appear as `ƒ`, a cookie has been read too high in the tree.
 *
 * Note the layout does NOT render the language toggle. A layout cannot know the current
 * pathname, and the toggle has to post the visitor back to the step they were on, so each
 * page renders it with its own path.
 */
export default async function EnrollLayout({
  children,
}: LayoutProps<"/enroll">) {
  const locale = await getLocale();

  return (
    <div lang={LOCALE_HTML_LANG[locale]} className="flex flex-1 flex-col">
      {children}
    </div>
  );
}
