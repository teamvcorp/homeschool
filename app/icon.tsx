import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Favicon, generated from the school crest at build time.
 *
 * Why generated rather than a static file: the crest is 350×387 (a portrait
 * shield), and browsers expect a square icon. Compositing it onto a navy square
 * here avoids shipping a squashed or letterboxed favicon — and avoids adding an
 * image-processing dependency just to crop one asset.
 *
 * This replaces public/favicon_io/, which contained an unrelated red star image
 * and was never referenced by the app anyway.
 *
 * ImageResponse notes: Satori supports flexbox only (no CSS grid), and every
 * container with multiple children needs an explicit `display: flex`.
 */
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

// Read at module scope so it happens once per build, not once per request.
const crestDataUri = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public", "vaLogoRevamp.png"),
).toString("base64")}`;

export default function Icon() {
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
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders
            raw <img>; next/image does not exist inside ImageResponse. */}
        <img src={crestDataUri} height={168} alt="" />
      </div>
    ),
    size,
  );
}
