import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";

/**
 * Chrome for every public marketing page.
 *
 * The header and footer used to be rendered by app/page.tsx itself, which worked
 * when the site had exactly one route. They live here now so all ~10 public pages
 * share them without duplication — and so the (docs), enroll, admin, and portal
 * areas can each supply their own chrome instead of inheriting this.
 *
 * Route groups do not affect the URL: app/(marketing)/page.tsx still serves "/".
 *
 * NOTE: never put an auth check in a layout. Layouts do not re-render on
 * navigation in the App Router, so the check would not run again after the first
 * paint. Authenticated areas verify per page and per action instead.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      {/* pt-16 clears the fixed header. #main is BOTH the skip-link target and the root
          the language lens scans for translatable blocks — see LanguageLens.tsx.
          The lens control itself lives in SiteHeader; this is only what it reads. */}
      <main id="main" className="flex-1 pt-16">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
