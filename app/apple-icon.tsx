import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Apple touch icon — 180×180 is the size iOS actually requests for a home-screen
 * bookmark. Rendered on an opaque navy field because iOS composites touch icons
 * onto a white sheet, which would wash out the crest's transparent edges.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const crestDataUri = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public", "vaLogoRevamp.png"),
).toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#12263f",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={crestDataUri} height={152} alt="" />
      </div>
    ),
    size,
  );
}
