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
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/portal", "/portal/", "/login", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
