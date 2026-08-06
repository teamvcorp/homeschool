"use client";

import Link from "next/link";

/**
 * ERROR BOUNDARY FOR THE ENROLLMENT FUNNEL
 * =============================================================================
 * The app-wide boundary in app/error.tsx would already catch these. This one exists because
 * the generic message is wrong HERE in a way that costs the school enrollments.
 *
 * A family part-way through an application who sees "something went wrong" reasonably assumes
 * their answers are gone and that they must start over — and a meaningful share of people
 * simply do not start over. That assumption is false: every completed step is written to a
 * server-side draft keyed by a signed httpOnly cookie (see lib/enrollment/draft.ts), so
 * returning to /enroll resumes exactly where they left off.
 *
 * Saying so is the entire point of this file. It is the difference between a lost application
 * and a two-minute interruption.
 *
 * ⚠️  DO NOT soften this into "your progress may be saved". The claim is verified against
 * `saveDraftStep` — each step is persisted as it is completed. If that ever stops being true,
 * this copy must change with it, not the other way round.
 */
export default function EnrollError({
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
        Enrollment
      </p>

      <h1 className="mb-4 text-3xl text-navy-900">
        We hit a problem — but your answers are saved.
      </h1>

      <p className="mb-4 leading-relaxed text-ink">
        Everything you have filled in so far has been saved. You do not need to start over.
        Try again, and you will pick up where you left off.
      </p>

      <p className="mb-6 leading-relaxed text-ink-muted">
        If it still will not go through, please call the school. We will take the application
        over the phone rather than have you fight with the form.
      </p>

      {error.digest ? (
        <p className="mb-6 rounded-lg border-l-4 border-l-gold-400 border-line bg-surface-muted px-4 py-3 text-sm leading-relaxed">
          When you call, please mention reference{" "}
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
          href="/enroll"
          className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-navy-900 transition-colors hover:bg-navy-50"
        >
          Back to enrollment
        </Link>
        <Link
          href="/contact"
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:text-navy-900"
        >
          Call the school
        </Link>
      </div>
    </main>
  );
}
