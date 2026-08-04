import type { MetadataRoute } from "next";
import { school } from "@/lib/site";

/**
 * Web app manifest, generated so the name and icon paths stay in sync with
 * lib/site.ts and the generated icons.
 *
 * Replaces public/favicon_io/site.webmanifest, which had empty name and
 * short_name fields and icon `src` paths pointing at /android-chrome-*.png when
 * the files actually lived in /favicon_io/ — so every icon reference 404'd.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${school.dbaName} — ${school.legalName}`,
    short_name: school.dbaName,
    description:
      "A K–12 nonpublic school in Storm Lake, Iowa. Mastery-based progression, ABA-informed instruction, and an integrated Taekwondo discipline framework.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#12263f",
    icons: [
      // Served by app/icon.tsx and app/apple-icon.tsx.
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
