import type { Instrumentation } from "next";

/**
 * SERVER-SIDE ERROR CAPTURE — THE WIDEST NET NEXT.JS OFFERS
 * =============================================================================
 * `onRequestError` fires for every error the Next server catches, whatever produced it:
 * Server Component renders, route handlers, server actions, and the proxy/middleware layer.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM `guardAction`. `guardAction` only wraps code we
 * remembered to wrap — the twelve server actions. It cannot see a throw inside a page's own
 * render, a route handler that misses a `try`, or anything added next year by someone who
 * did not know the convention. Those used to produce a bare Next stack trace in the server
 * output and a blank "Application error" for the visitor, correlated by nothing.
 *
 * This hook needs no cooperation from the code that fails, which is the entire point:
 * COVERAGE MUST NOT DEPEND ON REMEMBERING.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  `register` IS DELIBERATELY ABSENT
 *
 * `register()` runs once before the server accepts traffic, and anything slow or fallible in
 * it delays or prevents startup. There is nothing this app needs at that moment — the
 * database connects lazily and on demand — so adding one would be pure risk. If an APM is
 * ever introduced, it goes here, and it must not be able to throw.
 *
 * Verified against node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 * instrumentation.md for Next 16.3.0 — this project's Next differs from older releases, and
 * `onRequestError` is a v15+ export.
 */

/**
 * Reported errors, so a route failing on every request does not emit thousands of identical
 * lines. Keyed by route + error name. Bounded, and reset by any restart or redeploy.
 */
const seen = new Map<string, { count: number; firstAt: number }>();
const BURST_WINDOW_MS = 60_000;
const BURST_LIMIT = 5;
const SEEN_LIMIT = 500;

/** True when this exact failure has already been logged enough times in the current window. */
function isRepeat(key: string): { suppress: boolean; count: number } {
  const now = Date.now();
  const entry = seen.get(key);

  if (!entry || now - entry.firstAt > BURST_WINDOW_MS) {
    if (seen.size >= SEEN_LIMIT) seen.clear();
    seen.set(key, { count: 1, firstAt: now });
    return { suppress: false, count: 1 };
  }

  entry.count += 1;
  return { suppress: entry.count > BURST_LIMIT, count: entry.count };
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  /**
   * Imported lazily and inside the try. `lib/errors` is `server-only` and pulls in node:crypto;
   * a module-level import here would run in whatever runtime the hook is loaded into, and a
   * failure at import time would take out error reporting itself.
   */
  try {
    const { reportError, isNextControlFlow } = await import("./lib/errors");

    /**
     * `redirect()` and `notFound()` are implemented by throwing. They arrive here looking
     * exactly like failures, and reporting them would bury real errors under a flood of
     * successful navigations.
     */
    if (isNextControlFlow(error)) return;

    const name = error instanceof Error ? error.name : typeof error;
    const { suppress, count } = isRepeat(`${context.routePath}|${name}`);
    if (suppress) return;

    reportError(error, {
      /**
       * `routeType` is the useful half — 'render' | 'route' | 'action' | 'proxy' tells you
       * immediately whether a page, an endpoint, a form submission, or middleware failed.
       */
      where: `${context.routeType}:${context.routePath || request.path}`,
      detail: {
        method: request.method,
        /**
         * The route PATTERN (/admin/students/[id]) is already in `where`. This is the
         * concrete path, which can carry a record id — an internal identifier, not PII, and
         * the only way to find the specific record a failure involved.
         *
         * ⚠️  The QUERY STRING IS DROPPED. It can carry an email from a form GET or a token
         * from a link, and neither belongs in a log.
         */
        path: request.path.split("?")[0],
        routerKind: context.routerKind,
        renderSource: context.renderSource,
        revalidateReason: context.revalidateReason,
        ...(count > 1 ? { repeatInWindow: count } : {}),
      },
    });

    if (count === BURST_LIMIT) {
      console.error(
        JSON.stringify({
          level: "warn",
          event: "app.error.burst",
          where: context.routePath,
          message: `Suppressing further identical errors for ${BURST_WINDOW_MS / 1000}s.`,
        }),
      );
    }
  } catch (reportingFailure) {
    // Never let the reporter be the thing that breaks. Bare console, no dependencies.
    console.error("[instrumentation] error reporting failed", reportingFailure);
  }
};
