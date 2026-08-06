"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { SUPPORTED_LOCALES, LOCALE_LABELS, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

/**
 * THE LANGUAGE LENS
 * =============================================================================
 * Switch it on, tap a paragraph, read that paragraph in your language.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A DOM ISLAND AND NOT A PROP THREADED THROUGH THE PAGES
 *
 * Readable text reaches the marketing pages through five disjoint routes: string props
 * (PageHeader.lead, SectionHeading.lead, CTABand), opaque ReactNode children of Prose and
 * Callout, .map() output into Card/DataTable/ProcessSteps, bespoke per-section markup in
 * components/home/*, and ComparisonTable, which renders the same strings twice for desktop
 * and mobile. Threading a translation prop through all of that touches ~25 components and
 * ~10 page files.
 *
 * Reading the rendered DOM under <main id="main"> is agnostic to every one of those routes.
 * It also keeps the 18 marketing pages STATICALLY PRERENDERED, because nothing on the
 * server reads a cookie to make this work — which is the constraint that ruled out the
 * obvious alternatives.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY IT DOES NOT REUSE THE FUNNEL'S `va_lang` COOKIE
 *
 * Two reasons, and the second is the binding one:
 *
 *  1. `va_lang` is httpOnly, so client code cannot read it.
 *  2. Even if it could, the marketing pages are static — the server never renders them
 *     per-visitor, so it cannot pass a language down as a prop without making every page
 *     dynamic. The lens therefore owns its own preference in localStorage.
 *
 * These are genuinely different choices anyway: `va_lang` is the language a family FILLS IN
 * A FORM in; this is the language they READ A BROCHURE in.
 */

/** localStorage key for the reader's choice. Distinct from the funnel's `va_lang` cookie. */
const STORAGE_KEY = "va_lens_lang";

/**
 * Blocks the lens will translate. Leaf-ish text containers only — a wrapper that contains
 * other blocks would translate its children twice over.
 */
const BLOCK_SELECTOR = "p, li, h1, h2, h3, h4, dt, dd, blockquote, figcaption";

/** Below this, translating adds more clutter than comprehension (labels, "—", counts). */
const MIN_CHARS = 25;

/** Must match MAX_SOURCE_CHARS in lib/translate/service.ts. */
const MAX_CHARS = 4000;

type Status = "idle" | "loading" | "done" | "unavailable";

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

   Read via useSyncExternalStore rather than "useEffect + setState" for two
   reasons. The React Compiler rejects setState-in-effect outright — but the
   underlying reason is the real one: localStorage does not exist during SSR, so
   the value cannot be a lazy useState initialiser without a hydration mismatch,
   and an effect would render once with the wrong value and then correct itself.

   The server snapshot is null (lens off), which is also the honest default: a
   statically prerendered page genuinely does not know the reader's choice.
   Subscribing to `storage` gets cross-tab sync as a side effect.
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
  const [panelOpen, setPanelOpen] = useState(false);
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

  /**
   * ⚠️  NEVER ACTIVE IN THE ENROLLMENT FUNNEL.
   *
   * The funnel has reviewed catalogue translations, and the agreement must never be
   * machine-translated — its English wording is the instrument that `agreementHash()`
   * covers. This component is mounted from the marketing layout, which the funnel's own
   * layout nests inside, so the path check is what actually enforces the boundary here.
   * The endpoint refuses agreement text independently; this is the UI half of the same rule.
   */
  const inFunnel = pathname?.startsWith("/enroll") ?? false;

  const choose = useCallback((next: Locale | null) => {
    // The store is the single source of truth — writing it re-renders via the subscription.
    writeStored(next);
    setPanelOpen(false);
    if (!next) {
      // Turning the lens off removes every revealed translation.
      document.querySelectorAll("[data-lens-panel]").forEach((el) => el.remove());
      document
        .querySelectorAll("[data-lens-target]")
        .forEach((el) => el.removeAttribute("data-lens-target"));
    }
  }, []);

  /**
   * Marks eligible blocks so CSS can hint they are tappable, and wires one delegated
   * listener. Delegation rather than per-element listeners: the set of blocks changes on
   * navigation, and one listener on <main> cannot leak.
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
      if (text.length < MIN_CHARS || text.length > MAX_CHARS) continue;
      el.setAttribute("data-lens-target", "");
      eligible.push(el);
    }

    async function onClick(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-lens-target]",
      );
      if (!target || !locale) return;

      // Never hijack a click on a link or control inside the paragraph.
      const clicked = event.target as HTMLElement | null;
      if (clicked?.closest("a, button, input, select, textarea, label")) return;

      event.preventDefault();
      await reveal(target, locale);
    }

    main.addEventListener("click", onClick);
    return () => {
      main.removeEventListener("click", onClick);
      for (const el of eligible) el.removeAttribute("data-lens-target");
    };
  }, [locale, inFunnel, pathname]);

  // Escape closes the chooser.
  useEffect(() => {
    if (!panelOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPanelOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  if (inFunnel) return null;

  return (
    <div
      ref={rootRef}
      data-no-translate
      className="no-print fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
    >
      {panelOpen ? (
        <div
          role="dialog"
          aria-label="Reading language"
          className="w-64 rounded-2xl border border-line bg-white p-4 shadow-xl"
        >
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-gold-700">
            Read this page in
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
            Choose a language, then tap any paragraph to see it translated.
          </p>
          <ul className="mt-3 flex list-none flex-col gap-1.5">
            {SUPPORTED_LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((candidate) => (
              <li key={candidate}>
                <button
                  type="button"
                  lang={candidate}
                  onClick={() => choose(candidate)}
                  aria-current={locale === candidate ? "true" : undefined}
                  className={
                    locale === candidate
                      ? "w-full rounded-lg border border-navy-800 bg-navy-800 px-3 py-2 text-left text-sm font-semibold text-white"
                      : "w-full rounded-lg border border-line px-3 py-2 text-left text-sm text-ink-muted hover:border-navy-300 hover:text-navy-900"
                  }
                >
                  {LOCALE_LABELS[candidate]}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => choose(null)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-subtle underline hover:text-navy-900"
              >
                Turn off
              </button>
            </li>
          </ul>
          {/*
            Said plainly, and said before anyone relies on it. These translations are
            produced automatically; the English is what the school wrote.
          */}
          <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-subtle">
            Translations are automatic and may contain mistakes. The English text is the
            original.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        aria-label={
          locale
            ? `Reading language: ${LOCALE_LABELS[locale]}. Change or turn off.`
            : "Translate this page"
        }
        className={
          locale
            ? "flex items-center gap-2 rounded-full border border-navy-800 bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
            : "flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium text-navy-800 shadow-lg hover:border-navy-300"
        }
      >
        <MagnifierIcon />
        <span lang={locale ?? undefined}>{locale ? LOCALE_LABELS[locale] : "文A"}</span>
      </button>
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
async function reveal(target: HTMLElement, locale: Locale): Promise<void> {
  const existing = target.nextElementSibling;
  if (existing instanceof HTMLElement && existing.hasAttribute("data-lens-panel")) {
    existing.remove();
    return;
  }

  const source = target.textContent?.trim() ?? "";
  if (!source) return;

  const panel = document.createElement("div");
  panel.setAttribute("data-lens-panel", "");
  panel.setAttribute("data-no-translate", "");
  panel.lang = locale;
  panel.className =
    "my-2 rounded-lg border-l-4 border-l-gold-400 border border-line bg-surface-muted px-4 py-3";
  panel.innerHTML = `<p class="text-sm text-ink-subtle">…</p>`;
  target.insertAdjacentElement("afterend", panel);

  const result = await translateText(source, locale);

  const note = document.createElement("p");
  note.className = "mt-2 text-xs text-ink-subtle";
  note.lang = "en";
  note.textContent = "Automatic translation — the English above is the original.";

  const body = document.createElement("p");
  body.className = "leading-relaxed text-ink";
  body.lang = locale;

  if (result.status === "done") {
    body.textContent = result.text;
  } else {
    body.className = "text-sm leading-relaxed text-ink-subtle";
    body.lang = "en";
    body.textContent = "Translation is not available right now.";
  }

  panel.replaceChildren(body);
  if (result.status === "done") panel.appendChild(note);
}

/** Browser first, server second. */
async function translateText(
  text: string,
  locale: Locale,
): Promise<{ status: Exclude<Status, "idle" | "loading">; text: string }> {
  const local = await tryBrowserTranslate(text, locale);
  if (local) return { status: "done", text: local };

  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, locale }),
    });
    const data = (await response.json()) as { translation?: string | null };
    if (typeof data.translation === "string" && data.translation.trim()) {
      return { status: "done", text: data.translation };
    }
  } catch {
    // Network failure — fall through to unavailable.
  }
  return { status: "unavailable", text: "" };
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

function MagnifierIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
    </svg>
  );
}
