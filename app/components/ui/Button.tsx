import Link from "next/link";
import type { Route } from "next";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "gold" | "outline" | "ghostOnNavy";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  /** Default CTA — white on navy, ~15:1 contrast. */
  primary:
    "bg-navy-800 text-white shadow-sm hover:bg-navy-700 active:bg-navy-900 hover:shadow-md",
  /** The enroll action. Navy text on gold keeps it AA-compliant; white on gold would not. */
  gold: "bg-gold-400 text-navy-900 shadow-sm hover:bg-gold-300 active:bg-gold-500 hover:shadow-md",
  outline:
    "border border-navy-200 bg-white text-navy-800 shadow-sm hover:border-navy-300 hover:bg-navy-50",
  /** For use inside a navy section. */
  ghostOnNavy:
    "border border-navy-600 bg-transparent text-white hover:border-gold-300 hover:text-gold-300",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
};

/**
 * Internal navigation button. Uses next/link, so it prefetches and client-navigates.
 * For external destinations use `ExternalButtonLink` instead — it adds rel/target.
 */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: {
  /** Typed against the real route map — see `typedRoutes` in next.config.ts. */
  href: Route;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Plain `<a>` for mailto:, tel:, and off-site links. */
export function ExternalButtonLink({
  href,
  children,
  variant = "outline",
  size = "md",
  className = "",
  newTab = false,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  newTab?: boolean;
}) {
  return (
    <a
      href={href}
      // noreferrer alongside noopener: older browsers ignore the latter alone.
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </a>
  );
}

/** Right-pointing arrow used in CTAs. Decorative, so hidden from screen readers. */
export function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7l5 5m0 0l-5 5m5-5H6"
      />
    </svg>
  );
}
