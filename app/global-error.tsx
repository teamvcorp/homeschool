"use client";

/**
 * LAST-RESORT ERROR BOUNDARY
 * =============================================================================
 * Catches failures in the ROOT LAYOUT itself — the one place `app/error.tsx` cannot reach,
 * because that boundary renders *inside* the root layout it would need to replace.
 *
 * ⚠️  EVERY STYLE HERE IS INLINE, ON PURPOSE.
 *
 * Next renders this file as its own document, replacing the root layout, and the bundled
 * docs are explicit that global styles are NOT included. Beyond that: this is the boundary
 * that catches the root layout failing, so the stylesheet, the font loader, or the theme
 * script may be exactly what broke. A last-resort page that depends on the thing it exists
 * to survive is not a last resort. No Tailwind classes, no imports, no design tokens.
 *
 * Verified against node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 * error.md for Next 16.3.0. Note the prop is `retry`, NOT `reset` — `reset` still exists but
 * only clears the error state without re-fetching, so it cannot recover a Server Component
 * failure, which is most of what lands here.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          backgroundColor: "#fdfdfc",
          color: "#1a1a1a",
        }}
      >
        <title>Something went wrong — The VA School</title>
        <main style={{ maxWidth: "34rem" }}>
          <p
            style={{
              margin: "0 0 0.5rem",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6b6b6b",
            }}
          >
            The VA School
          </p>

          <h1 style={{ margin: "0 0 1rem", fontSize: "1.75rem", lineHeight: 1.2 }}>
            Something went wrong.
          </h1>

          <p style={{ margin: "0 0 1rem", lineHeight: 1.6 }}>
            This is a problem on our end, not anything you did. Nothing you have already
            submitted has been lost.
          </p>

          {/*
            The digest is Next's own identifier for this failure and it appears in the server
            log. Showing it is what turns "the website broke" into a phone call the school can
            actually act on. It is random and meaningless on its own — safe to display.
          */}
          {error.digest ? (
            <p
              style={{
                margin: "0 0 1.5rem",
                padding: "0.75rem 1rem",
                backgroundColor: "#f4f2ed",
                borderLeft: "3px solid #c9a227",
                fontSize: "0.875rem",
                lineHeight: 1.6,
              }}
            >
              If you call the school, please mention reference{" "}
              <strong style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {error.digest}
              </strong>
              . It lets us find exactly what happened.
            </p>
          ) : null}

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                padding: "0.625rem 1.25rem",
                border: "none",
                borderRadius: "0.5rem",
                backgroundColor: "#c9a227",
                color: "#1a1a1a",
                fontSize: "0.9375rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/*
              A PLAIN <a>, NOT next/link, and the lint rule is suppressed deliberately.

              `<Link>` performs a client-side navigation, which re-enters the same React tree
              that just failed — including the root layout this boundary exists because it
              broke. A full document load is the only navigation guaranteed to escape it.
              This is also the one file that must not import from next/link, in case the
              router itself is implicated.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: "0.5rem",
                border: "1px solid #d8d5cd",
                color: "#1a1a1a",
                fontSize: "0.9375rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Go to the home page
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
