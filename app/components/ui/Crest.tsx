import Image from "next/image";
import Link from "next/link";
import crest from "@/public/vaLogoRevamp.png";
import { school } from "@/lib/site";

/**
 * The school crest. Static import so Next derives intrinsic dimensions at build
 * time — no layout shift, no hardcoded width/height to drift out of sync.
 *
 * NOTE: `priority` is deprecated in Next 16. This never sets `preload`; exactly
 * one image site-wide should (the home page hero, the LCP candidate). The crest
 * in the header is small and gets `loading="eager"` instead so it paints
 * immediately without competing for preload priority.
 */
export function Crest({
  size = 40,
  className = "",
  eager = false,
}: {
  size?: number;
  className?: string;
  eager?: boolean;
}) {
  return (
    <Image
      src={crest}
      alt=""
      /* Decorative here: the adjacent wordmark carries the accessible name, so
         announcing "The VA School crest" too would be a duplicate for screen
         readers. Where the crest appears alone, pass a real alt via Image. */
      aria-hidden="true"
      width={size}
      height={size}
      loading={eager ? "eager" : "lazy"}
      className={`h-auto w-auto object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Crest + wordmark lockup. Used in the header and footer.
 * `onNavy` flips the type colors for dark backgrounds.
 */
export function Wordmark({
  onNavy = false,
  size = 40,
  withTagline = false,
  eager = false,
}: {
  onNavy?: boolean;
  size?: number;
  withTagline?: boolean;
  eager?: boolean;
}) {
  return (
    <span className="flex items-center gap-3">
      <Crest size={size} eager={eager} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-serif text-lg font-bold tracking-tight ${
            onNavy ? "text-white" : "text-navy-900"
          }`}
        >
          The VA School
        </span>
        <span
          className={`mt-0.5 text-[0.65rem] font-medium uppercase tracking-[0.12em] ${
            onNavy ? "text-navy-300" : "text-ink-subtle"
          }`}
        >
          {withTagline ? school.tagline : "Von Der Becke Academy"}
        </span>
      </span>
    </span>
  );
}

/** The lockup as a link home. */
export function WordmarkLink({
  onNavy = false,
  size = 40,
  eager = false,
}: {
  onNavy?: boolean;
  size?: number;
  eager?: boolean;
}) {
  return (
    <Link
      href="/"
      className="shrink-0 rounded-lg"
      aria-label={`${school.dbaName} — home`}
    >
      <Wordmark onNavy={onNavy} size={size} eager={eager} />
    </Link>
  );
}
