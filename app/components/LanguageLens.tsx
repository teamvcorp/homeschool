"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  DEFAULT_LOCALE,
  type Locale,
} from "@/lib/i18n/locales";
import { translator } from "@/lib/i18n";

/**
 * THE LANGUAGE LENS
 * =============================================================================
 * Switch it on, tap a paragraph, read that paragraph in your language.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO THINGS LEARNED FROM SOMEONE ACTUALLY USING IT
 *
 * 1. IT LIVES IN THE HEADER. The first version floated bottom-right and took the school
 *    a minute to find. A translation control that has to be hunted for has already failed
 *    the person who needs it, so it now sits in the nav with everything else.
 *
 * 2. ITS OWN COPY IS TRANSLATED. The first version kept the chooser's instructions in
 *    English after you picked Spanish or Lao — an English sentence explaining how to read
 *    the page in Lao, shown to the one person who cannot read English. Every string this
 *    component renders now comes from the message catalogue in the selected language.
 *
 *    The discovery problem that creates: BEFORE anything is selected there is no selected
 *    language, so what language should the invitation be in? Each option carries a short
 *    hint in ITS OWN language (`lens.tapHint`), so a Lao reader sees Lao next to ລາວ
 *    without having to read a word of English first.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A DOM ISLAND AND NOT A PROP THREADED THROUGH THE PAGES
 *
 * Readable text reaches the marketing pages through five disjoint routes: string props
 * (PageHeader.lead, SectionHeading.lead, CTABand), opaque ReactNode children of Prose and
 * Callout, .map() output into Card/DataTable/ProcessSteps, bespoke per-section markup in
 * components/home/*, and ComparisonTable, which renders the same strings twice for desktop
 * and mobile. Threading a translation prop through all of that touches ~25 components.
 *
 * Reading the rendered DOM under <main id="main"> is agnostic to every one of those routes,
 * and keeps the 18 marketing pages STATICALLY PRERENDERED, because nothing on the server
 * reads a cookie to make it work.
 *
 * WHY IT DOES NOT REUSE THE FUNNEL'S `va_lang` COOKIE: that cookie is httpOnly, and even if
 * it were not, reading it server-side would make every static page dynamic. The lens keeps
 * its own preference in localStorage. They are different choices anyway — `va_lang` is the
 * language a family FILLS IN A FORM in; this is the language they READ A BROCHURE in.
 */

/** localStorage key for the reader's choice. Distinct from the funnel's `va_lang` cookie. */
const STORAGE_KEY = "va_lens_lang";

/**
 * Blocks the lens will translate. Leaf-ish text containers only — a wrapper that contains
 * other blocks would translate its children twice over.
 *
 * Table cells are included because DataTable carries real content on these pages (grade
 * levels, graduation requirements, the ESA figures), not just chrome.
 */
const BLOCK_SELECTOR =
  "p, li, h1, h2, h3, h4, h5, h6, dt, dd, blockquote, figcaption, th, td, summary";

/** Headings, which get their own — much lower — length floor. Must be a subset of the above. */
const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6, summary, dt, th";

/**
 * Below this, translating adds more clutter than comprehension (labels, "—", counts).
 *
 * ⚠️  HEADINGS NEED THEIR OWN FLOOR, and not having one was a real bug. Headings were in the
 * selector from the start, but the site's are short by design — "Who teaches here" is 16
 * characters, "Four pathways" 13, "Funding" 7 — so a flat 25-character floor filtered out
 * nearly every heading on the site one line after selecting it. The reader's report was
 * that headings did not respond; they were never eligible.
 *
 * A heading is the one thing a lost reader looks at first, so the floor here is only high
 * enough to skip a bare numeral or initialism.
 */
const MIN_CHARS = 25;
const HEADING_MIN_CHARS = 4;

/**
 * HOVER, THE PRIMARY GESTURE — and why it cannot be the only one.
 *
 * Pointing at a paragraph and having it translate is the magnifying-glass metaphor working
 * as advertised, so on a mouse it is the primary gesture. But hover does not exist on a
 * phone and cannot be reached from a keyboard, and the families most likely to need this
 * are the most likely to be on a phone. So hover is layered ON TOP of tap/click, never in
 * place of it. Three ways in, one behaviour:
 *
 *   hover (mouse only)  → transient panel, disappears when the pointer leaves
 *   tap / click         → PINNED panel, stays until tapped again
 *   Enter / Space       → same as click (targets become focusable only while the lens is on)
 *
 * DWELL, not instant. Every reveal can cost a model call, and a pointer crossing the page
 * passes over a dozen paragraphs on its way somewhere else. A short dwell separates
 * "pointing at this" from "moving past this" and is the main thing standing between hover
 * and a bill.
 */
const HOVER_DWELL_MS = 320;

/**
 * Grace period before a transient panel is dismissed.
 *
 * The panel renders BELOW its paragraph, so the reader's pointer has to LEAVE the paragraph
 * to read the translation. Dismissing on leave would delete the panel at the exact moment
 * it started being useful. The handler treats paragraph and panel as one hover region, and
 * this covers the gap crossed between them.
 */
const HOVER_GRACE_MS = 260;

/** Must match MAX_SOURCE_CHARS in lib/translate/service.ts. */
const MAX_CHARS = 4000;

/**
 * Chrome/Edge on-device translation. Typed loosely and used entirely defensively: the API
 * is young, its shape may move, and Lao may not be an available pair. Any surprise — a
 * missing method, a rejected promise, an unavailable model — falls through to the server.
 */
type TranslatorApi = {
  availability?: (opts: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
  create: (opts: { sourceLanguage: string; targetLanguage: string }) => Promise<{
    translate: (text: string) => Promise<string>;
  }>;
};

function browserTranslator(): TranslatorApi | null {
  const api = (globalThis as { Translator?: TranslatorApi }).Translator;
  return api && typeof api.create === "function" ? api : null;
}

/* ---------------------------------------------------------------------------
   The stored preference, as an external store.

   Read via useSyncExternalStore rather than "useEffect + setState": localStorage
   does not exist during SSR, so the value cannot be a lazy useState initialiser
   without a hydration mismatch, and an effect would render once with the wrong
   value and then correct itself. The server snapshot is null (lens off), which
   is also the honest default — a statically prerendered page genuinely does not
   know the reader's choice. Subscribing to `storage` gets cross-tab sync free.
   --------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

function subscribeToStored(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

/** Must return a primitive — a fresh object each call would loop forever. */
function getStoredSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** No localStorage on the server, and no reader preference to know. */
function getStoredServerSnapshot(): string | null {
  return null;
}

function writeStored(next: Locale | null): void {
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, next);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing or storage disabled: the choice applies now but will not persist.
  }
  // `storage` only fires in OTHER tabs, so notify this one explicitly.
  for (const listener of listeners) listener();
}

export default function LanguageLens() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const stored = useSyncExternalStore(
    subscribeToStored,
    getStoredSnapshot,
    getStoredServerSnapshot,
  );

  /**
   * Derived, not stored in state. A corrupt or stale value (a locale we have since
   * dropped, or English, which means "off") resolves to null rather than indexing the
   * label map with something unexpected.
   */
  const locale: Locale | null =
    stored && stored !== DEFAULT_LOCALE && (SUPPORTED_LOCALES as readonly string[]).includes(stored)
      ? (stored as Locale)
      : null;

  /** The chooser speaks the reader's language once they have one; English until then. */
  const tr = translator(locale ?? DEFAULT_LOCALE);

  /**
   * ⚠️  NEVER ACTIVE IN THE ENROLLMENT FUNNEL.
   *
   * The funnel has reviewed catalogue translations, and the agreement must never be
   * machine-translated — its English wording is the instrument that `agreementHash()`
   * covers. The header renders on funnel routes too, so this check is what enforces the
   * boundary in the UI. The endpoint refuses agreement text independently.
   */
  const inFunnel = pathname?.startsWith("/enroll") ?? false;

  const choose = useCallback((next: Locale | null) => {
    // The store is the single source of truth — writing it re-renders via the subscription.
    writeStored(next);
    setOpen(false);
    if (!next) {
      // Turning the lens off removes every revealed translation.
      document.querySelectorAll("[data-lens-panel]").forEach((el) => el.remove());
      document
        .querySelectorAll("[data-lens-target]")
        .forEach((el) => el.removeAttribute("data-lens-target"));
    }
  }, []);

  /**
   * Marks eligible blocks so CSS can hint they are tappable, and wires ONE delegated
   * listener. Delegation rather than per-element listeners: the set of blocks changes on
   * navigation, and a single listener on <main> cannot leak.
   */
  useEffect(() => {
    if (!locale || inFunnel) return;

    const main = document.getElementById("main");
    if (!main) return;

    const eligible: HTMLElement[] = [];
    for (const el of Array.from(main.querySelectorAll<HTMLElement>(BLOCK_SELECTOR))) {
      if (el.closest("[data-no-translate]")) continue;
      if (el.closest("[data-lens-panel]")) continue;
      // Leaf-ish only: skip anything that contains another translatable block.
      if (el.querySelector(BLOCK_SELECTOR)) continue;
      const text = el.textContent?.trim() ?? "";
      const floor = el.matches(HEADING_SELECTOR) ? HEADING_MIN_CHARS : MIN_CHARS;
      if (text.length < floor || text.length > MAX_CHARS) continue;
      el.setAttribute("data-lens-target", "");
      /**
       * Focusable ONLY while the lens is on. Making every paragraph on the site a tab stop
       * would be a serious regression for keyboard users, so the tab stops appear only for
       * the reader who deliberately turned translation on — for whom they are the point —
       * and the cleanup below takes them away again.
       */
      el.tabIndex = 0;
      eligible.push(el);
    }

    const active = locale;
    const strings = {
      notice: tr("lens.notice"),
      unavailable: tr("lens.unavailable"),
    };

    /** Only a mouse gets hover. Touch and pen fire pointerover on tap, which would double-fire. */
    const canHover =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let dwellTimer: number | undefined;
    let dismissTimer: number | undefined;
    let hovered: HTMLElement | null = null;

    /** A click on a link or control inside a paragraph belongs to the link, not the lens. */
    function isInteractive(node: EventTarget | null): boolean {
      return Boolean(
        (node as HTMLElement | null)?.closest("a, button, input, select, textarea, label"),
      );
    }

    function onClick(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-lens-target]",
      );
      if (!target || isInteractive(event.target)) return;
      event.preventDefault();
      // Clicking commits: the panel is pinned and survives the pointer leaving.
      window.clearTimeout(dismissTimer);
      void reveal(target, active, strings, "pin");
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-lens-target]",
      );
      if (!target || isInteractive(event.target)) return;
      event.preventDefault(); // Space would scroll the page.
      void reveal(target, active, strings, "pin");
    }

    function onPointerOver(event: PointerEvent) {
      if (!canHover || event.pointerType !== "mouse") return;
      const from = event.target as HTMLElement | null;
      if (!from) return;

      // Inside an open panel: the reader is reading it. Cancel any pending dismissal.
      if (from.closest("[data-lens-panel]")) {
        window.clearTimeout(dismissTimer);
        return;
      }

      const target = from.closest<HTMLElement>("[data-lens-target]");
      if (!target) return;
      // Moving between children of the same paragraph is not a new hover.
      if (target === hovered) {
        window.clearTimeout(dismissTimer);
        return;
      }

      window.clearTimeout(dwellTimer);
      window.clearTimeout(dismissTimer);
      hovered = target;
      dwellTimer = window.setTimeout(() => {
        void reveal(target, active, strings, "transient");
      }, HOVER_DWELL_MS);
    }

    function onPointerOut(event: PointerEvent) {
      if (!canHover || event.pointerType !== "mouse") return;
      const to = event.relatedTarget as HTMLElement | null;
      /**
       * Paragraph and panel are ONE hover region. Leaving the paragraph for its own panel
       * (or for a child of either) is not leaving.
       */
      if (to && (to.closest("[data-lens-target]") === hovered || to.closest("[data-lens-panel]")))
        return;

      window.clearTimeout(dwellTimer);
      const leaving = hovered;
      hovered = null;
      if (!leaving) return;

      dismissTimer = window.setTimeout(() => {
        const panel = panelFor(leaving);
        // A pinned panel was asked for deliberately; only hover's own panels are transient.
        if (panel && !panel.hasAttribute("data-lens-pinned")) panel.remove();
      }, HOVER_GRACE_MS);
    }

    main.addEventListener("click", onClick);
    main.addEventListener("keydown", onKeyDown);
    main.addEventListener("pointerover", onPointerOver);
    main.addEventListener("pointerout", onPointerOut);

    return () => {
      main.removeEventListener("click", onClick);
      main.removeEventListener("keydown", onKeyDown);
      main.removeEventListener("pointerover", onPointerOver);
      main.removeEventListener("pointerout", onPointerOut);
      window.clearTimeout(dwellTimer);
      window.clearTimeout(dismissTimer);
      for (const el of eligible) {
        el.removeAttribute("data-lens-target");
        el.removeAttribute("tabindex");
      }
    };
    /**
     * `tr` is deliberately NOT a dependency. `translator()` returns a fresh closure on every
     * render, so depending on it would tear this effect down and rebuild it on every render —
     * and the cleanup strips `data-lens-target` from every element. `locale` is what actually
     * changes the strings, and it IS a dependency.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, inFunnel, pathname]);

  // Escape closes; so does a click outside. Matches the header's other dropdowns.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (inFunnel) return null;

  return (
    <div ref={rootRef} data-no-translate className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        lang={locale ?? undefined}
        title={tr("lens.open")}
        className={
          locale
            ? "flex items-center gap-1.5 rounded-lg border border-navy-800 bg-navy-800 px-2.5 py-1.5 text-sm font-semibold text-white"
            : "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-navy-900"
        }
      >
        <GlobeIcon />
        <span>{locale ? LOCALE_LABELS[locale] : "文A"}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={tr("lens.title")}
          lang={locale ?? undefined}
          className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-line bg-white p-4 shadow-xl"
        >
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-gold-700">
            {tr("lens.title")}
          </p>

          <ul className="mt-3 flex list-none flex-col gap-1.5">
            {SUPPORTED_LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((candidate) => {
              /**
               * Each option carries a hint IN ITS OWN LANGUAGE. This is what makes the
               * control usable before a language is chosen — a Lao reader sees Lao next to
               * ລາວ rather than an English sentence they cannot read.
               */
              const hint = translator(candidate)("lens.tapHint");
              const isCurrent = locale === candidate;
              return (
                <li key={candidate}>
                  <button
                    type="button"
                    lang={candidate}
                    onClick={() => choose(candidate)}
                    aria-current={isCurrent ? "true" : undefined}
                    className={
                      isCurrent
                        ? "w-full rounded-lg border border-navy-800 bg-navy-800 px-3 py-2 text-left text-white"
                        : "w-full rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-navy-300"
                    }
                  >
                    <span className="block text-sm font-semibold">
                      {LOCALE_LABELS[candidate]}
                    </span>
                    <span
                      className={`mt-0.5 block text-xs leading-snug ${
                        isCurrent ? "text-navy-100" : "text-ink-subtle"
                      }`}
                    >
                      {hint}
                    </span>
                  </button>
                </li>
              );
            })}

            {locale ? (
              <li>
                <button
                  type="button"
                  lang={locale}
                  onClick={() => choose(null)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-subtle underline hover:text-navy-900"
                >
                  {tr("lens.off")}
                </button>
              </li>
            ) : null}
          </ul>

          {locale ? (
            <p lang={locale} className="mt-3 text-xs leading-relaxed text-ink-muted">
              {tr("lens.howTo")}
            </p>
          ) : null}

          {/* Said plainly, and said before anyone relies on it. */}
          <p
            lang={locale ?? undefined}
            className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-subtle"
          >
            {tr("lens.disclosure")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Reveals (or hides) the translation for one block.
 *
 * Toggling is why the panel is a sibling node rather than a rewrite of the original: the
 * English must stay on the page, visible, next to its translation. Replacing the text in
 * place would make the original unrecoverable and would quietly present machine output as
 * the school's own words.
 */
/** The panel belonging to a target, if one is open. */
function panelFor(target: HTMLElement): HTMLElement | null {
  const next = target.nextElementSibling;
  return next instanceof HTMLElement && next.hasAttribute("data-lens-panel") ? next : null;
}

/**
 * Targets with a reveal in flight.
 *
 * ⚠️  THE GUARD THAT MAKES DOUBLE-DISPATCH HARMLESS. `reveal` inserts its panel
 * synchronously and then awaits the translation, so two handlers firing for one gesture
 * used to read as: first inserts the panel, second sees a panel and toggles it away. The
 * panel appeared and vanished inside one tick, which is indistinguishable from the click
 * not registering at all — and that is exactly the bug a duplicated mount produced.
 *
 * The duplicate mount is fixed at its source in SiteHeader.tsx. This is the belt to that
 * braces, and it also covers the ordinary cases: hover's dwell firing as a click lands, or
 * a browser synthesising a click after a tap.
 */
const revealing = new WeakSet<HTMLElement>();

/**
 * Translations already fetched this page view, keyed by locale + source.
 *
 * The server cache makes a repeat translation free in money; this makes it free in latency
 * too, so re-hovering a paragraph is instant rather than a round trip. Bounded, because an
 * unbounded Map on a long reading session is a leak.
 */
const memo = new Map<string, string | null>();
const MEMO_LIMIT = 200;

async function translateMemoized(source: string, locale: Locale): Promise<string | null> {
  const key = `${locale} ${source}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;

  const result = await translateText(source, locale);
  if (memo.size >= MEMO_LIMIT) {
    const oldest = memo.keys().next();
    if (!oldest.done) memo.delete(oldest.value);
  }
  memo.set(key, result);
  return result;
}

/**
 * `pin` — the reader asked for this (tap, click, Enter). Toggles, and survives the pointer
 *          moving away.
 * `transient` — hover. Never toggles anything off, and is dismissed when the pointer leaves.
 */
type RevealMode = "pin" | "transient";

async function reveal(
  target: HTMLElement,
  locale: Locale,
  strings: { notice: string; unavailable: string },
  mode: RevealMode,
): Promise<void> {
  if (revealing.has(target)) return;

  const existing = panelFor(target);
  if (existing) {
    // Hover must never close a panel — only the deliberate gesture toggles.
    if (mode === "transient") return;
    existing.remove();
    return;
  }

  const source = target.textContent?.trim() ?? "";
  if (!source) return;

  const panel = document.createElement("div");
  panel.setAttribute("data-lens-panel", "");
  panel.setAttribute("data-no-translate", "");
  if (mode === "pin") panel.setAttribute("data-lens-pinned", "");
  panel.lang = locale;
  panel.className =
    "my-2 rounded-lg border border-line border-l-4 border-l-gold-400 bg-surface-muted px-4 py-3";

  const loading = document.createElement("p");
  loading.className = "text-sm text-ink-subtle";
  loading.textContent = "…";
  panel.appendChild(loading);
  target.insertAdjacentElement("afterend", panel);

  revealing.add(target);
  let result: string | null;
  try {
    result = await translateMemoized(source, locale);
  } finally {
    // Released even if the fetch throws, or the paragraph is dead to the lens forever.
    revealing.delete(target);
  }

  /**
   * The panel can be gone by now: hover's grace timer, a second click, or a navigation
   * between the request going out and coming back. Writing into a detached node would be
   * harmless but pointless — and re-attaching it would resurrect a panel the reader dismissed.
   */
  if (!panel.isConnected) return;

  const body = document.createElement("p");
  body.lang = locale;
  if (result) {
    body.className = "leading-relaxed text-ink";
    body.textContent = result;
  } else {
    body.className = "text-sm leading-relaxed text-ink-subtle";
    body.textContent = strings.unavailable;
  }
  panel.replaceChildren(body);

  if (result) {
    const note = document.createElement("p");
    note.className = "mt-2 text-xs text-ink-subtle";
    note.lang = locale;
    note.textContent = strings.notice;
    panel.appendChild(note);
  }
}

/** Browser first, server second. Returns null when neither can help. */
async function translateText(text: string, locale: Locale): Promise<string | null> {
  const local = await tryBrowserTranslate(text, locale);
  if (local) return local;

  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, locale }),
    });
    const data = (await response.json()) as { translation?: string | null };
    if (typeof data.translation === "string" && data.translation.trim()) {
      return data.translation;
    }
  } catch {
    // Network failure — fall through.
  }
  return null;
}

/**
 * The on-device path: free, private, and instant where the browser supports the pair.
 *
 * Wrapped in a single try/catch on purpose. This API is young and its exact surface may
 * change; Lao in particular may not be an available on-device pair. Any deviation at all —
 * missing method, rejected promise, model unavailable — must fall through silently to the
 * server rather than surface an error to a reader.
 */
async function tryBrowserTranslate(text: string, locale: Locale): Promise<string | null> {
  const api = browserTranslator();
  if (!api) return null;
  try {
    if (typeof api.availability === "function") {
      const state = await api.availability({ sourceLanguage: "en", targetLanguage: locale });
      // Only take the instant path. "downloadable" would block a reader on a model download.
      if (state !== "available") return null;
    }
    const translator = await api.create({ sourceLanguage: "en", targetLanguage: locale });
    const out = await translator.translate(text);
    return typeof out === "string" && out.trim() ? out : null;
  } catch {
    return null;
  }
}

function GlobeIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
    </svg>
  );
}
