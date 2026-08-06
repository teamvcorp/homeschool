
/**
 * ERROR REPORTING — ONE FUNNEL, ONE LINE PER FAILURE
 * =============================================================================
 * Every server-side failure in this app should end up here, and each one emits exactly one
 * structured line carrying a REFERENCE the family can read aloud over the phone.
 *
 * The problem this solves: before it existed, a failure produced
 * `console.error("[action] unhandled error", err)` with no route, no action name, and
 * nothing linking it to what the person on the phone was looking at. When a parent says
 * "it wouldn't let me submit", there was no way to find their failure in the log.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  THE REFERENCE IS NOT A SECRET, AND IT IS NOT A SESSION ID
 *
 * It is shown to the visitor on purpose, so it must be safe to show: random, meaningless on
 * its own, and useless for guessing anything else. It identifies AN EVENT IN THE LOG, never
 * a person or a record.
 *
 * Where Next.js has already produced a `digest` (it does for errors thrown during a server
 * render, and shows it in the error boundary), that digest is reused as the reference rather
 * than inventing a competing one — otherwise the number on the family's screen and the
 * number in the log would differ, which is worse than having neither.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  WHY THE MESSAGE IS SCRUBBED BEFORE IT IS LOGGED
 *
 * This is a K-12 school. Error messages routinely quote the input that caused them, and the
 * input here is a child's name, a home address, a date of birth, or a parent's email. A
 * validation library saying `Invalid email: parent@example.com` writes a real family's
 * address into the log, where it will sit indefinitely, get shipped to whatever aggregator
 * comes later, and appear in screenshares.
 *
 * `scrub()` therefore runs over every message and stack before it is emitted. It is
 * deliberately aggressive: over-redacting costs a little debugging convenience, while
 * under-redacting puts student PII somewhere it does not belong. The audit log already
 * follows the same rule by holding no PII at all.
 */

/**
 * How a failure should be TREATED, which is not the same as what threw.
 *
 * The distinction that matters to the reader: "the school's systems are briefly unreachable,
 * try again shortly" is a genuinely different message from "this broke and someone needs to
 * look at it". Conflating them tells a family to call the school over a five-second network
 * blip.
 */
export type ErrorClass =
  /** Infrastructure the app depends on is unreachable or slow. Usually transient. */
  | "unavailable"
  /** The caller is not allowed. Never elaborated to the caller. */
  | "authorization"
  /** A genuine defect, or something we have not classified yet. */
  | "unknown";

export interface ErrorReport {
  /** Safe to display. Quote this on the phone to find the log line. */
  reference: string;
  class: ErrorClass;
}

/** Where the failure happened. Free-form but SHORT — it is the log's primary grouping key. */
export interface ErrorContext {
  /** e.g. "action:submitApplication", "route:/api/translate", "render:/admin/students". */
  where: string;
  /** Anything else useful AND non-identifying. Values are scrubbed; keys are not. */
  detail?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Patterns redacted from anything logged.
 *
 * ⚠️  ORDER IS LOAD-BEARING, AND GETTING IT WRONG IS SILENT.
 *
 * Every rule here consumes text, so a broad rule placed early starves a narrow one placed
 * later. Two that actually bit:
 *
 *   - The DATE rule must precede the PHONE rule. "2011-04-17" is ten characters of digits
 *     and separators, so the deliberately-broad phone pattern matches it first and a date of
 *     birth gets logged as "[phone]". Still redacted, so nothing leaks — but the label is a
 *     lie, and a scrubber you cannot trust to say what it removed is one you stop trusting.
 *   - EMAIL must precede both, or the digits inside an address are replaced first and the
 *     address no longer matches as an email.
 *
 * Rule of thumb: most specific first, broadest last. verify-errors.mjs asserts each label.
 */
const SCRUBBERS: ReadonlyArray<readonly [RegExp, string]> = [
  // Email addresses. First — it is the most structured and the most common.
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]"],
  // Mongo connection strings, which carry credentials.
  [/mongodb(\+srv)?:\/\/[^\s"']+/gi, "[mongodb-uri]"],
  // Bearer tokens, API keys, and password assignments.
  [/\b(sk-|key-|Bearer\s+)[A-Za-z0-9_\-]{8,}/gi, "[secret]"],
  [/\b(password|passwd|secret|token|apikey|api_key)\b\s*[:=]\s*\S+/gi, "$1=[redacted]"],
  // Dates of birth and any other bare ISO date. BEFORE the phone rule — see above.
  [/\b\d{4}-\d{2}-\d{2}\b/g, "[date]"],
  // Phone numbers, loosely. Deliberately broad, so it goes last.
  [/\b\+?\d[\d\s().-]{8,}\d\b/g, "[phone]"],
];

/**
 * Removes the kinds of values that identify a family, from any string bound for the log.
 *
 * Not a guarantee — a scrubber cannot recognise "Robert" as a name. It removes the
 * MECHANICAL identifiers that actually show up in error text. The real defence is not
 * putting PII into error messages in the first place.
 */
export function scrub(input: string): string {
  let out = input;
  for (const [pattern, replacement] of SCRUBBERS) out = out.replace(pattern, replacement);
  return out;
}

/** Short, unambiguous when read aloud: no vowels (so no accidental words), no 0/O/1/I/L. */
const REFERENCE_ALPHABET = "23456789ACDEFGHJKMNPQRTVWXYZ";

/**
 * ⚠️  WEB CRYPTO, NOT `node:crypto`, AND NO `server-only` MARKER ON THIS FILE.
 *
 * Both were here originally and both broke the build. `instrumentation.ts` is loaded outside
 * the App Router's Server Component graph and can be evaluated in the Edge runtime, where
 * `server-only` throws at import and `node:crypto` does not exist. Since instrumentation is
 * the widest error net we have, this module has to be importable from it — so it stays
 * runtime-agnostic. `globalThis.crypto` is present in Node 18+ and in Edge.
 */
function generateReference(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
    if (i === 3) out += "-";
  }
  return out;
}

/** Reuses Next's digest when it produced one, so screen and log agree. See the header. */
function referenceFor(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
  ) {
    const digest = (error as { digest: string }).digest;
    // Next's control-flow signals are not failures and must never be reported as one.
    if (!digest.startsWith("NEXT_")) return digest;
  }
  return generateReference();
}

/**
 * Recognises "the database or network is unreachable" without importing the driver's error
 * classes, which would drag a server-only dependency into every caller.
 *
 * Matched on name first, because the driver's messages are not stable across versions.
 */
function classify(error: unknown): ErrorClass {
  if (!(error instanceof Error)) return "unknown";

  if (error.name === "AuthorizationError") return "authorization";

  const name = error.name;
  if (
    name === "MongoNetworkError" ||
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkTimeoutError" ||
    name === "MongoTimeoutError" ||
    name === "MongoNotConnectedError"
  ) {
    return "unavailable";
  }

  // Node's own socket-level failures, which surface as a `code` rather than a distinct name.
  const code = (error as NodeJS.ErrnoException).code;
  if (
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "UND_ERR_CONNECT_TIMEOUT"
  ) {
    return "unavailable";
  }

  if (/timed out|timeout|server selection|connection closed/i.test(error.message)) {
    return "unavailable";
  }

  return "unknown";
}

/**
 * True for the exceptions Next throws to implement `redirect()` and `notFound()`.
 *
 * ⚠️  These are CONTROL FLOW, not failures. Reporting them would bury every real error under
 * a flood of successful redirects, and — worse — a caller that treats this as an error and
 * swallows it silently breaks the redirect.
 */
export function isNextControlFlow(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
        (error as { digest: string }).digest === "NEXT_NOT_FOUND"),
  );
}

/**
 * Records one failure and returns the reference to show the visitor.
 *
 * ⚠️  NEVER THROWS. Reporting an error must not be able to cause one — a logger that can
 * fail turns a handled failure into an unhandled one, which is the single most common way
 * error handling makes an outage worse.
 */
export function reportError(error: unknown, context: ErrorContext): ErrorReport {
  try {
    if (isNextControlFlow(error)) {
      // Should not reach here; treated as a no-op rather than logged as a failure.
      return { reference: "-", class: "unknown" };
    }

    const kind = classify(error);
    const reference = referenceFor(error);

    const line = {
      level: kind === "unavailable" ? "warn" : "error",
      event: "app.error",
      reference,
      class: kind,
      where: context.where,
      name: error instanceof Error ? error.name : typeof error,
      message: scrub(error instanceof Error ? error.message : String(error)),
      /**
       * Stacks are scrubbed too. A stack frame can carry a query string, and an
       * `Error("Invalid email: ...")` puts the address into the first stack line as well.
       */
      stack:
        error instanceof Error && error.stack
          ? scrub(error.stack).split("\n").slice(0, 12).join("\n")
          : undefined,
      cause:
        error instanceof Error && error.cause instanceof Error
          ? scrub(`${error.cause.name}: ${error.cause.message}`)
          : undefined,
      ...(context.detail
        ? {
            detail: Object.fromEntries(
              Object.entries(context.detail).map(([k, v]) => [
                k,
                typeof v === "string" ? scrub(v) : v,
              ]),
            ),
          }
        : {}),
      at: new Date().toISOString(),
    };

    /**
     * ONE LINE, AS JSON. A multi-line human dump is unreadable once two requests interleave,
     * and every log platform this could later ship to (CloudWatch, Vercel, Datadog) parses a
     * single JSON line for free. `console.error` rather than a logging library on purpose:
     * one fewer dependency, and stdout/stderr is what every host already collects.
     */
    console.error(JSON.stringify(line));

    return { reference, class: kind };
  } catch {
    // Reporting itself broke. Say so plainly and give the caller something to show.
    console.error(JSON.stringify({ level: "error", event: "app.error.reporter-failed" }));
    return { reference: "-", class: "unknown" };
  }
}

/**
 * The visitor-facing sentence for a class of failure, with the reference appended.
 *
 * Kept here, next to the classification, so the message and the class it describes cannot
 * drift apart. Deliberately free of technical detail: a raw error string can leak a
 * connection string or a collection name, and a family can do nothing useful with either.
 */
export function messageFor(report: ErrorReport): string {
  switch (report.class) {
    case "unavailable":
      return `We could not reach the school's systems just now. This is usually brief — please try again in a moment. If it keeps happening, call the school and mention reference ${report.reference}.`;
    case "authorization":
      return "You do not have access to do that.";
    default:
      return `Something went wrong on our end. Please try again, or call the school and mention reference ${report.reference}.`;
  }
}
