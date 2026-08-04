import Image from "next/image";

interface ImagePlaceholderProps {
  alt: string;
  src?: string;
  className?: string;
  aspectRatio?: string;
  /**
   * Sizing hint for the responsive srcset. Default assumes a roughly half-width
   * image on desktop, full-width on mobile. Pass an accurate value for anything
   * that differs — a wrong `sizes` is the usual reason next/image still ships a
   * needlessly large file.
   */
  sizes?: string;
  /**
   * Set on the single largest above-the-fold image on the page (the LCP
   * candidate) — currently only the home hero.
   *
   * Next 16 note: the old `priority` prop is deprecated in favor of `preload`,
   * and the docs warn against using it on more than one image, since competing
   * preloads defeat the purpose. Everything else above the fold should use
   * `eager` instead.
   */
  preload?: boolean;
  /** Loads immediately without claiming preload priority. */
  eager?: boolean;
}

/**
 * Content image with a graceful unset-source fallback.
 *
 * Rewritten to use next/image: the source PNGs in public/ are 2–9 MB each, and
 * the previous raw <img> shipped every one of those bytes to every visitor at
 * every viewport. next/image serves resized, reformatted variants instead.
 */
export default function ImagePlaceholder({
  alt,
  src,
  className = "",
  aspectRatio = "aspect-video",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px",
  preload = false,
  eager = false,
}: ImagePlaceholderProps) {
  if (src) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-navy-50 ${aspectRatio} ${className}`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          {...(preload ? { preload: true } : {})}
          {...(eager && !preload ? { loading: "eager" as const } : {})}
          className="object-cover"
        />
      </div>
    );
  }

  // No source yet — render a labelled placeholder rather than a broken image, so
  // an unfinished page still communicates what belongs there.
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border-2 border-dashed border-navy-200 bg-navy-50 ${aspectRatio} ${className}`}
    >
      <div className="px-4 text-center">
        <svg
          className="mx-auto mb-2 h-10 w-10 text-navy-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
          />
        </svg>
        <p className="text-xs font-medium leading-snug text-navy-400">{alt}</p>
      </div>
    </div>
  );
}
