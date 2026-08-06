import Link from "next/link";
import type { Route } from "next";
import { logoutAction } from "@/lib/actions/auth";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { AuthenticatedUser } from "@/lib/dal";
import { Crest } from "../ui/Crest";

/**
 * Header for authenticated areas.
 *
 * A Server Component: the only interactive element is the sign-out form, which is
 * a plain <form> posting a Server Action — so this ships zero client JavaScript
 * and still works with JS disabled.
 *
 * Takes the already-resolved user as a prop rather than calling the DAL itself.
 * The page has authenticated by the time it renders this, and passing the value
 * down avoids implying that rendering a header is what grants access.
 */
export default function SecureHeader({
  user,
  nav,
}: {
  user: AuthenticatedUser;
  nav: readonly { label: string; href: Route }[];
}) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Crest size={32} eager />
            <div className="leading-none">
              <p className="font-serif text-base font-bold text-navy-900">
                The VA School
              </p>
              <p className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-ink-subtle">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* The name is the link to your own account — where the password is changed.
                A generated password is useless if the screen that replaces it cannot be
                found, so this is reachable from every authenticated page rather than
                buried under /admin, which parents and instructors cannot reach. */}
            <Link
              href="/account"
              className="hidden text-sm text-ink-muted underline-offset-4 transition-colors hover:text-navy-900 hover:underline sm:inline"
            >
              {user.name}
            </Link>
            {/* Sign-out as a POST, not a GET link: a GET logout can be triggered
                by any image tag on any page the user visits. */}
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full border border-navy-200 px-4 py-1.5 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {nav.length > 0 ? (
          <nav aria-label="Section" className="-mb-px flex gap-1 overflow-x-auto">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-gold-400 hover:text-navy-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
