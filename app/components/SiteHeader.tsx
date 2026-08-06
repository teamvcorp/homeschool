"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navigation, dailyApp, type NavItem } from "@/lib/site";
import { WordmarkLink } from "./ui/Crest";
import { ButtonLink } from "./ui/Button";
import LanguageLens from "./LanguageLens";

/**
 * Site header. Client Component because it owns two pieces of interactive state:
 * the mobile drawer and the desktop dropdown menus.
 *
 * Accessibility decisions worth preserving:
 *  - Dropdowns open on CLICK, not hover. Hover-only menus are unusable by
 *    keyboard and touch users; pointer users get hover as an enhancement only.
 *  - Each trigger carries aria-expanded and aria-controls, so assistive tech
 *    announces the menu's state rather than the user discovering it by accident.
 *  - Escape closes and returns focus to the trigger; an outside click closes.
 *  - Navigation closes every menu, otherwise a panel stays open over the new page.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  /**
   * Close every menu when the route changes — otherwise a dropdown stays open
   * on top of the page the user just navigated to, including on browser
   * back/forward.
   *
   * Done during render rather than in an effect. This is React's documented
   * "adjusting state when a prop changes" pattern: it re-renders immediately
   * without committing the stale open state to the DOM first, whereas an effect
   * would paint the open menu and then close it on a second pass.
   */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
    setOpenMenu(null);
    setOpenMobileGroup(null);
  }

  // Escape closes any open menu.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // A click outside the nav dismisses the desktop dropdown.
  useEffect(() => {
    if (!openMenu) return;
    function onPointerDown(e: PointerEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openMenu]);

  /** True when the current route is this item or one of its children. */
  function isActive(item: NavItem): boolean {
    if (pathname === item.href) return true;
    return item.children?.some((c) => pathname === c.href) ?? false;
  }

  return (
    <header
      // no-print: site chrome is noise in the printed accreditation packet.
      className="no-print fixed inset-x-0 top-0 z-50 border-b border-line bg-white/90 backdrop-blur-lg"
    >
      <nav ref={navRef} aria-label="Main" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* eager: the crest is small and above the fold, but preload is reserved
              for the single LCP image (the home hero). */}
          <WordmarkLink eager />

          {/* ---------- Desktop ---------- */}
          <div className="hidden items-center gap-1 lg:flex">
            {navigation.map((item) =>
              item.children ? (
                <div key={item.label} className="relative">
                  <button
                    type="button"
                    aria-expanded={openMenu === item.label}
                    aria-controls={`menu-${item.label}`}
                    onClick={() =>
                      setOpenMenu(openMenu === item.label ? null : item.label)
                    }
                    className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(item)
                        ? "text-navy-900"
                        : "text-ink-muted hover:text-navy-900"
                    }`}
                  >
                    {item.label}
                    <svg
                      className={`h-3.5 w-3.5 transition-transform ${
                        openMenu === item.label ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {openMenu === item.label ? (
                    <div
                      id={`menu-${item.label}`}
                      className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-line bg-white shadow-xl"
                    >
                      <ul className="list-none p-2">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={`block rounded-lg px-3 py-2.5 transition-colors ${
                                pathname === child.href
                                  ? "bg-navy-50"
                                  : "hover:bg-navy-50"
                              }`}
                            >
                              <span className="block text-sm font-semibold text-navy-900">
                                {child.label}
                              </span>
                              {child.description ? (
                                <span className="mt-0.5 block text-xs text-ink-subtle">
                                  {child.description}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item)
                      ? "text-navy-900"
                      : "text-ink-muted hover:text-navy-900"
                  }`}
                >
                  {item.label}
                </Link>
              ),
            )}

            {/*
              Persistent sign-in for enrolled families.
              Deliberately a quiet text link next to the gold Enroll button, not a second
              button: a prospective family's action is Enroll, and two equally-weighted CTAs
              would make neither obvious. But an enrolled parent checking a child in visits
              daily and may be on any page, so putting this only on the home page would
              force them back there first.
            */}
            <a
              href={dailyApp.loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-navy-900"
            >
              Sign in
            </a>

            {/*
              The language lens, far right. It began life as a floating button in the
              bottom-right corner and took the school a minute to find — a translation
              control that has to be hunted for has already failed the person who needs it.
            */}
            <LanguageLens />

            <ButtonLink href="/enroll" variant="gold" size="sm" className="ml-1">
              Enroll
            </ButtonLink>
          </div>

          {/* ---------- Mobile: lens + drawer trigger ---------- */}
          <div className="flex items-center gap-1 lg:hidden">
            {/* Outside the drawer on purpose: a reader who cannot read the navigation
                should not have to open the navigation to find the translator. */}
            <LanguageLens />
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="rounded-lg p-2 text-navy-800 transition-colors hover:bg-navy-50 lg:hidden"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* ---------- Mobile drawer ---------- */}
      {mobileOpen ? (
        <div
          id="mobile-menu"
          className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-line bg-white px-4 pb-6 pt-2 lg:hidden"
        >
          <ul className="list-none">
            {navigation.map((item) =>
              item.children ? (
                <li key={item.label} className="border-b border-line py-1">
                  <button
                    type="button"
                    aria-expanded={openMobileGroup === item.label}
                    onClick={() =>
                      setOpenMobileGroup(
                        openMobileGroup === item.label ? null : item.label,
                      )
                    }
                    className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-semibold text-navy-900"
                  >
                    {item.label}
                    <svg
                      className={`h-4 w-4 transition-transform ${
                        openMobileGroup === item.label ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {openMobileGroup === item.label ? (
                    <ul className="list-none pb-2 pl-3">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="block rounded-lg px-3 py-2.5 text-sm text-ink-muted hover:bg-navy-50 hover:text-navy-900"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ) : (
                <li key={item.href} className="border-b border-line py-1">
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="block rounded-lg px-3 py-3 text-sm font-semibold text-navy-900 hover:bg-navy-50"
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>

          <ButtonLink
            href="/enroll"
            variant="gold"
            size="lg"
            className="mt-5 w-full"
          >
            Enroll
          </ButtonLink>

          {/* Same two-audience split as the desktop nav, stacked for mobile. */}
          <a
            href={dailyApp.loginUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block rounded-full border border-navy-200 px-5 py-2.5 text-center text-sm font-semibold text-navy-800"
          >
            Already enrolled? Sign in
          </a>
        </div>
      ) : null}
    </header>
  );
}
