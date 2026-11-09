import type { Metadata, Viewport } from "next";
import { Geist, Source_Serif_4, Noto_Sans_Lao } from "next/font/google";
import { school, mission } from "@/lib/site";
import "./globals.css";

/**
 * Fonts. Source Serif 4 carries headings (an institutional, document-adjacent
 * brand — a geometric sans alone undercuts an accreditation claim), Geist
 * carries UI and body copy. Geist Mono was removed: nothing used it, and every
 * font shipped is bytes the visitor pays for.
 *
 * Both are exposed as CSS vars consumed by the `@theme inline` block in
 * globals.css, which is what generates the `font-sans` / `font-serif` utilities.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

/**
 * LAO SCRIPT SUPPORT — NOT OPTIONAL, NOT COSMETIC.
 *
 * Geist and Source Serif 4 are both loaded with `subsets: ["latin"]` and contain NO Lao
 * glyphs. Without a Lao-capable face, every Lao string renders as tofu — a row of empty
 * boxes — which is a worse experience than plain English and looks like a broken site
 * rather than a translated one.
 *
 * Applied by attribute selector in globals.css (`[lang="lo"]`) rather than by adding a
 * class at each call site, so ANY element marked as Lao picks it up automatically,
 * including the language toggle's own button before the visitor has switched.
 *
 * Loaded site-wide rather than lazily per locale: `next/font` self-hosts and subsets at
 * build time, and conditionally loading a font per request is not something next/font
 * supports. Latin-reading visitors never download it, because nothing on their page
 * matches the selector that references it.
 */
const notoSansLao = Noto_Sans_Lao({
  variable: "--font-lao",
  subsets: ["lao"],
  display: "swap",
  weight: ["400", "600", "700"],
});

/**
 * The site's absolute origin, used for metadataBase, Open Graph URLs, and JSON-LD.
 *
 * The localhost fallback is deliberate — see the fuller note in app/sitemap.ts. In short: a
 * guessed-domain fallback silently attributes this school's pages to another organisation
 * when the environment variable is missing, whereas localhost makes the misconfiguration
 * obvious.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${school.dbaName} — ${school.tagline}`,
    /** Page-level `title` values fill the %s. */
    template: `%s — ${school.dbaName}`,
  },
  /**
   * NATIONAL POSITIONING (2026-11-09): online across the US, local campuses as needed.
   * Wording comes from `school.reach` in lib/site.ts — see its honesty limits.
   */
  description: `Mastery-based K–12 education. ${school.reach.national}, with ${school.reach.campuses.toLowerCase()}. ABA-informed instruction and a standard every student is supported to reach.`,
  applicationName: school.dbaName,
  authors: [{ name: school.legalName }],
  /** National keywords only, by decision on 2026-11-09 (local Iowa terms dropped). */
  keywords: [
    "online homeschool curriculum",
    "homeschool support United States",
    "K-12 online curriculum",
    "homeschool teacher support",
    "mastery-based learning",
    "standards-based homeschool curriculum",
    "Applied Behavior Analysis school",
    "private K-12 school",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: school.dbaName,
    title: `${school.dbaName} — ${school.tagline}`,
    description: `Mastery-based K–12 education, ${school.reach.national.toLowerCase()}. Every student held to the highest standard, with every support needed to reach it.`,
  },
  twitter: {
    card: "summary_large_image",
    title: `${school.dbaName} — ${school.tagline}`,
    description: `Mastery-based K–12 education, ${school.reach.national.toLowerCase()}.`,
  },
  robots: { index: true, follow: true },
};

/**
 * Viewport and theme color live here, NOT in `metadata` — `metadata.viewport`,
 * `metadata.themeColor`, and `metadata.colorScheme` are all deprecated.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#12263f",
  colorScheme: "light",
};

/**
 * Structured data. This is a real bricks-and-mortar school, so the address,
 * founding date, and nonprofit status are worth making machine-readable for
 * local search.
 */
function StructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: school.legalName,
    alternateName: school.dbaName,
    slogan: school.tagline,
    description: mission,
    url: siteUrl,
    logo: `${siteUrl}/vaLogoRevamp.png`,
    email: school.email,
    telephone: school.phone,
    foundingDate: String(school.established),
    /**
     * The corporation was founded in Florida in 2012 and moved to Storm Lake in 2019.
     * Without `foundingLocation`, `foundingDate` sitting beside an Iowa `address` reads
     * as "founded here in 2012", which is not true.
     */
    foundingLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressRegion: "FL", addressCountry: "US" },
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: school.address.street,
      addressLocality: school.address.city,
      addressRegion: school.address.stateCode,
      postalCode: school.address.zip,
      addressCountry: "US",
    },
    /**
     * National reach for search engines. The `address` above stays: it is the real,
     * physical first campus, and a fake or missing address would be worse than local.
     */
    areaServed: { "@type": "Country", name: "United States" },
    founder: {
      "@type": "Person",
      name: school.headOfSchool,
      jobTitle: "Head of School",
    },
  };

  return (
    <script
      type="application/ld+json"
      // Static, developer-authored object — no user input reaches this.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      /**
       * REQUIRED in Next 16: the framework no longer overrides scroll-behavior
       * during router navigation, so the CSS rule in globals.css is not enough
       * on its own. Without this attribute, in-page anchors jump instead of
       * scrolling smoothly.
       */
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${sourceSerif.variable} ${notoSansLao.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        {/* Keyboard users get past the nav without tabbing through every link. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-lg focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <StructuredData />
        {children}
      </body>
    </html>
  );
}
