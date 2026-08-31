import type { MetadataRoute } from "next";

/** See the note in app/sitemap.ts — the localhost fallback is deliberate. */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * robots.txt
 *
 * The disallow list is defense-in-depth, not access control: it keeps
 * authenticated areas out of search results, but it is a request to well-behaved
 * crawlers and nothing more. Real protection for /admin and /portal comes from
 * session checks in every page and every server action.
 *
 * Note the enrollment funnel's inner steps are excluded — /enroll is the public
 * entry point worth indexing; a draft-state URL mid-wizard is not.
 *
 * ⚠️  /reset-password IS THE ONE ENTRY THAT IS NOT MERELY TIDINESS. Its URL carries a live
 * reset token in the query string, so an indexed copy would be a published credential.
 * The page also sets `robots: noindex` in its metadata — belt and braces, because these
 * protect against different things: robots.txt asks a crawler not to fetch, the meta tag
 * tells one that fetched anyway not to index.
 *
 * Neither stops a link-preview bot in a chat app from fetching the URL. What makes that
 * harmless is that the page only PEEKS at the token — redemption happens on POST — so a
 * preview fetch cannot burn a family's link. See lib/auth/token.ts.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/portal",
          "/portal/",
          "/login",
          "/account",
          "/forgot-password",
          "/reset-password",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
