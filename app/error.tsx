"use client";

import Link from "next/link";

/**
 * THE APP-WIDE ERROR BOUNDARY
 * =============================================================================
 * Catches an unhandled throw in any route segment below the root layout — a page render, a
 * nested layout, a data fetch a page forgot to guard. Before this existed, those produced
 * Next's bare error screen with no explanation and nothing tying the visitor's experience to
 * a line in the log.
 *
 * ⚠️  THIS DOES NOT REPLACE `instrumentation.ts`, AND IT IS NOT WHERE LOGGING HAPPENS.
 *
 * This component runs on the CLIENT. The server has already caught and logged the failure by
 * the time it renders, via `onRequestError`. Logging again from here would double-count every
 * error and — because a Server Component's message is deliberately replaced with a generic
 * one before it reaches the browser — the second copy would carry no detail anyway.
 *
 * So this file has exactly one job: tell the visitor what happened, in the school's voice,
 * and show them the reference that connects their call to the log line.
 *
 * Verified against the bundled Next 16.3.0 docs. The recovery prop is `retry`, not `reset` —
 * `reset` only clears the boundary's state without re-fetching, so it cannot recover from a
 * Server Component failure, which is the common case here.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 py-16"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-ink-subtle">
        The VA School
      </p>

      <h1 className="mb-4 text-3xl text-navy-900">This page didn&rsquo;t load.</h1>

      <p className="mb-4 leading-relaxed text-ink">
        Something went wrong on our end — not anything you did. Nothing you have already
        submitted has been lost.
      </p>

      {/*
        Next's own identifier for this failure, which also appears in the server log. Showing
        it is what turns "the website broke" into something the school can actually look up.
        It is random and meaningless on its own, so it is safe to put on screen.
      */}
      {error.digest ? (
        <p className="mb-6 rounded-lg border-l-4 border-l-gold-400 border-line bg-surface-muted px-4 py-3 text-sm leading-relaxed">
          If you call the school, please mention reference{" "}
          <strong className="font-mono">{error.digest}</strong>. It lets us find exactly what
          happened.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-lg bg-gold-400 px-5 py-2.5 text-sm font-semibold text-navy-900 transition-colors hover:bg-gold-300"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-navy-900 transition-colors hover:bg-navy-50"
        >
          Go to the home page
        </Link>
        <Link
          href="/contact"
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:text-navy-900"
        >
          Contact the school
        </Link>
      </div>
    </main>
  );
}
