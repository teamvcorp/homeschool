import type { MetadataRoute } from "next";
import { accreditationDocs } from "@/lib/site";

/**
 * The site's absolute origin.
 *
 * The fallback is localhost DELIBERATELY. An earlier version fell back to a guessed
 * production domain, which turned out to belong to a different organisation — so a missing
 * environment variable would have quietly published this school's sitemap, canonical URLs,
 * and structured data pointing at someone else's website.
 *
 * A localhost fallback is obviously wrong in production, which is the point: it surfaces a
 * misconfiguration instead of hiding it behind a plausible-looking domain. Set
 * NEXT_PUBLIC_SITE_URL in the deployment environment.
 *
 * Read from process.env rather than lib/env.ts on purpose: this file is prerendered at
 * build time, and importing the validated env module would make the build require runtime
 * secrets again.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Sitemap.
 *
 * Priorities reflect what we actually want ranked: the home page and the
 * enrollment path first, informational pages next, and the accreditation packet
 * last — those documents matter enormously to one Iowa DE reviewer and very
 * little to search traffic.
 *
 * Keep this list in sync when adding a public route. Authenticated areas
 * (/admin, /portal) are deliberately absent and are also disallowed in robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "", priority: 1.0, changeFrequency: "monthly" },
    { path: "/enroll", priority: 0.9, changeFrequency: "monthly" },
    { path: "/admissions", priority: 0.9, changeFrequency: "monthly" },
    { path: "/tuition", priority: 0.8, changeFrequency: "monthly" },
    { path: "/curriculum", priority: 0.8, changeFrequency: "yearly" },
    { path: "/higher-institute", priority: 0.8, changeFrequency: "yearly" },
    { path: "/mission", priority: 0.7, changeFrequency: "yearly" },
    { path: "/about", priority: 0.7, changeFrequency: "yearly" },
    { path: "/handbook", priority: 0.7, changeFrequency: "yearly" },
    { path: "/staff", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
    { path: "/accreditation", priority: 0.5, changeFrequency: "yearly" },
  ];

  return [
    ...pages.map((p) => ({
      url: `${siteUrl}${p.path}`,
      lastModified: now,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...accreditationDocs.map((doc) => ({
      url: `${siteUrl}/accreditation/${doc.slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];
}
