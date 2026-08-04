import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * No CSP yet — see the note at the bottom of this file. Everything here is
 * uncontroversial hardening that cannot break a working page.
 */
const securityHeaders = [
  // Stop MIME sniffing turning an uploaded file into executable script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Deny framing outright: nothing here is meant to be embedded, and this closes
  // clickjacking against the admin area.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Explicitly surrender powerful APIs the site never uses.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Force HTTPS for two years, including subdomains. Only meaningful over TLS,
  // and harmless locally since browsers ignore HSTS on http://localhost.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Keep the site out of cross-origin games it never plays.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

const nextConfig: NextConfig = {
  /**
   * Stable in this version (`experimental.typedRoutes` is deprecated). Generates
   * the global PageProps/LayoutProps/RouteContext helpers and typechecks every
   * <Link href> — valuable across ~30 routes, where a typo'd href otherwise ships
   * silently.
   */
  typedRoutes: true,

  // Deliberately NOT enabling cacheComponents. It would remove `dynamic` and
  // `revalidate`, require <Suspense> around every uncached read, and forbid
  // `use cache` inside route handler bodies. For a form- and
  // authenticated-read-heavy app that is a large migration for little gain.
  // See docs/nextjs-16-conventions.md before revisiting.

  experimental: {
    /**
     * `serverActions` remains under `experimental` in 16.3.0 — verified against
     * node_modules/next/dist/server/config-shared.d.ts, not assumed.
     */
    serverActions: {
      /**
       * Server Actions already enforce a same-origin check. Naming the production
       * origin explicitly keeps that working behind Vercel's proxy layer.
       */
      ...(siteUrl ? { allowedOrigins: [new URL(siteUrl).host] } : {}),
      /**
       * bodySizeLimit is left at its 1 MB default deliberately: the enrollment
       * wizard submits only text, and raising a body limit raises the cost of an
       * abusive POST. Immunization documents are attached by staff through an
       * authenticated route, never posted by the public.
       */
    },
    /**
     * Hardening available in this Next line: validates that RSC request headers
     * match the client's cache-busting parameter, closing the request/response
     * cache-confusion class of bug.
     */
    validateRSCRequestHeaders: true,
  },

  images: {
    /**
     * The source PNGs in public/ are 2–9 MB each, so serving modern formats
     * matters more here than usual.
     */
    formats: ["image/avif", "image/webp"],
    /**
     * `qualities` defaults to [75] only in Next 16 — an out-of-list `quality` prop
     * is coerced to the nearest allowed value rather than honoured. Declaring the
     * set explicitly makes that behaviour visible instead of surprising.
     */
    qualities: [75],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  /**
   * NO CUSTOM `webpack` KEY. Turbopack is the default bundler in Next 16, and a
   * webpack config here would fail `next build` outright.
   */

  /**
   * TODO before public deploy: add a Content-Security-Policy.
   *
   * Omitted rather than half-done. Next injects inline scripts for hydration and
   * RSC payloads, so a correct policy needs nonce plumbing through the proxy, and
   * a CSP that breaks hydration is worse than none. This Next line also carried a
   * CSP-nonce XSS advisory (fixed in the pinned version), so it should be built
   * against current guidance and actually tested. Tracked in
   * docs/security-checklist.md.
   */
};

export default nextConfig;
