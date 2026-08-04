# Design system

Tokens live in the `@theme` block of `app/globals.css`. **Tailwind v4 is CSS-first —
there is no `tailwind.config` file and there should not be one.** Declaring
`--color-navy-900` there automatically generates `bg-navy-900`, `text-navy-900`,
`border-navy-900`, and the CSS variable.

## Palette rationale

The crest (`public/vaLogoRevamp.png`) is a gold-framed shield with four quadrants —
red/orange, green, blue, gold.

- **Navy + gold carry the institutional chrome.** Gold is the crest's frame colour,
  so the logo sits on navy naturally, and the pairing matches the look of the Iowa DE
  accreditation documents.
- **The four quadrant hues are a controlled *category* palette.** The source material
  is full of four-way sets: 4 cohorts, 4 career pathways, 4 program areas. The
  mapping is decided once in `lib/site.ts` (`categoryStyles`), never hardcoded in a
  component.

### Accessibility rules that are not optional

- **A category colour is identity, never the only signal.** Every card using one also
  carries a text label, so the grouping survives colourblindness and greyscale
  printing.
- **Gold text on light backgrounds must use `gold-600`** (~4.7:1). `gold-300`/`400`
  fail AA on white — those steps are for fills, borders, and gold text *on navy*.
- **`ink-subtle` (`#6b7c91`) is the lightest permissible text colour on white**
  (~4.6:1). Anything lighter is a bug.
- Navy lighter than `navy-600` is wash/fill only, never body copy.

### Contrast targets

| Pair | Target |
|---|---|
| `ink` on white | ~13:1 |
| `navy-900` on white | ~15:1 |
| white on `navy-800` | ~11:1 |
| `gold-300` on `navy-900` | ~8.5:1 |
| `gold-600` on white | ~4.7:1 |
| each `crest-*-600` on white | ≥4.5:1 |

These are **design targets, not measured values.** Verify with a contrast checker
before shipping a new pairing.

## Dark mode: no

Deliberate. It would double the styling surface across ~10 content pages plus admin
tables, the brand is document-like and print-adjacent, the accreditation packet must
render light, and none existed before. Revisit after v1 if asked.

## Typography

- **Source Serif 4** — headings. A serif carries a 14-year institutional claim that a
  geometric sans undercuts, and it survives the print stylesheet.
- **Geist** — UI and body.
- **Geist Mono was removed.** Nothing used it, and every shipped font is bytes the
  visitor pays for.

Both load via `next/font/google` in `app/layout.tsx` and are exposed as CSS vars
consumed by `@theme inline` (which is required for values referencing other CSS
vars — a plain `@theme` resolves them too early).

### The Arial bug, for posterity

`app/globals.css` used to contain `body { font-family: Arial, Helvetica, sans-serif }`.
Tailwind's preflight already wires `--font-sans` onto `<html>`, and a `font-family` on
`body` **overrides that inherited value** — so the site rendered in Arial for its
entire life despite loading Geist. The fix was deleting one declaration. **Do not add
a `font-family` to `body`.**

## Component inventory

`app/components/ui/`

| Component | Purpose |
|---|---|
| `Section`, `Eyebrow`, `SectionHeading` | Vertical rhythm + gutters. Owns `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` so no page repeats it |
| `Button` — `ButtonLink`, `ExternalButtonLink`, `ArrowIcon` | `ButtonLink` is internal (typed `Route`); `ExternalButtonLink` is for `mailto:`/`tel:`/off-site |
| `Card`, `CardTitle`, `CardBody`, `CardGrid` | `CardGrid` renders a `<ul>` — these are lists of things, and screen readers announce the count |
| `Table` — `DataTable`, `ComparisonTable` | `scope="col"`/`scope="row"`, `<caption>`, and an `overflow-x-auto` wrapper so wide tables scroll *inside themselves* rather than making the page scroll sideways. `ComparisonTable` collapses to stacked cards under `md` |
| `Callout`, `Statement` | `variant="statute"` is the Iowa Code citation style |
| `ProcessSteps`, `CycleSteps` | Real `<ol>`; numerals are decorative and `aria-hidden` |
| `PageHeader`, `Prose`, `FactList` | Interior page header (one `<h1>` per page) and long-form prose |
| `CTABand` | Closing CTA |
| `Crest`, `Wordmark`, `WordmarkLink` | Static-imported logo, so intrinsic dimensions come from the file — no layout shift, no hardcoded size to drift |

## Layout conventions

- Sections: `py-16 sm:py-24`
- Cards: `rounded-2xl border border-line bg-white shadow-sm hover:shadow-lg`
- Buttons: fully rounded (`rounded-full`)
- Readable measure for prose: `max-w-3xl`

## Print

`@media print` in `app/globals.css`. The accreditation packet at
`/accreditation/[doc]` is a real output target — an Iowa DE reviewer prints it to
PDF. **No PDF-generation dependency**; browser print-to-PDF against good print CSS.

- `.no-print` — site chrome, nav, CTAs
- `.print-keep` — `break-inside: avoid` for callouts and table rows
- `.print-break-before` — force a page break
- Link URLs are spelled out via `a[href^="http"]::after`, so a printed page stays
  verifiable
- `@page { margin: 0.75in }`

## Accessibility baseline

- Skip-to-content link in the root layout; `#main` on every main element
- `:focus-visible` ring in gold on every interactive element
- `prefers-reduced-motion` disables animation and smooth scroll
- Dropdowns open on **click**, not hover, with `aria-expanded` / `aria-controls`;
  Escape closes; outside click closes
- Form errors: `aria-invalid` + `aria-describedby` per field, plus an `aria-live`
  region for form-level messages
- One `<h1>` per page (via `PageHeader`), `<h2>` from `SectionHeading` below it

## Images

- `next/image` throughout, via `app/components/ImagePlaceholder.tsx`, which also
  renders a labelled placeholder when `src` is omitted
- **`preload` on exactly one image site-wide** — the home hero (LCP candidate).
  `priority` is deprecated in Next 16, and multiple preloads defeat the purpose.
  Everything else above the fold uses `loading="eager"`
- `next.config.ts` enables AVIF/WebP; `qualities: [75]` is declared explicitly
  because that is now the only default
- ⚠️ The source PNGs in `public/` are still **2–9 MB each**. `next/image` optimises
  delivery, but an 8.8 MB original still has to be read and cached. **Losslessly
  recompressing these is outstanding work.**
