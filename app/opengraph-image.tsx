import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { school } from "@/lib/site";

/**
 * Social share card — the image that appears when the site is linked in a text
 * message, Slack, Facebook, or a search result preview.
 *
 * 1200×630 is the standard OG aspect ratio. Text renders in Geist, which
 * next/og bundles as its default font, so no font fetch or local font asset is
 * needed.
 *
 * SATORI CONSTRAINTS (both of these will fail the build, not degrade quietly):
 *  1. Flexbox only — no CSS grid.
 *  2. Any element with more than one child node needs an explicit
 *     `display: flex`. That includes JSX like `Est. {year}`, which is two child
 *     nodes (a string and an expression), and text broken by a <br />. Every
 *     text node below is therefore a single precomputed string in its own leaf
 *     element.
 */
export const alt = `${school.dbaName} — ${school.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const crestDataUri = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public", "vaLogoRevamp.png"),
).toString("base64")}`;

// Precomputed so each element below has exactly one text child.
const eyebrow = `Storm Lake, Iowa · Est. ${school.established}`;
const taglineLineOne = "We don’t lower the bar.";
const taglineLineTwo = "We raise the student.";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 64,
          background: "#12263f",
          padding: "0 80px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders
            raw <img>; next/image does not exist inside ImageResponse. */}
        <img src={crestDataUri} height={340} alt="" />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, letterSpacing: 4, color: "#f2c14e" }}>
            {eyebrow}
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: 68,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {school.dbaName}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 24,
              fontSize: 34,
              color: "#dce5f0",
            }}
          >
            <div>{taglineLineOne}</div>
            <div>{taglineLineTwo}</div>
          </div>

          {/* Gold rule echoing the crest's frame. */}
          <div
            style={{
              marginTop: 32,
              width: 160,
              height: 6,
              background: "#e0a81b",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
