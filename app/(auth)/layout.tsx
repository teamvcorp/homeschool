import Link from "next/link";
import { school } from "@/lib/site";
import { Crest } from "@/app/components/ui/Crest";

/**
 * Minimal chrome for authentication screens.
 *
 * No site nav: a sign-in page should present one task and no distractions, and
 * there is nothing to explore here for someone who cannot get in.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-surface-muted">
      <main
        id="main"
        className="flex flex-1 items-center justify-center px-4 py-12"
      >
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center">
            <Link href="/" aria-label={`${school.dbaName} — home`}>
              <Crest size={64} eager />
            </Link>
            <h1 className="mt-4 font-serif text-2xl font-bold text-navy-900">
              {school.dbaName}
            </h1>
            <p className="mt-1 text-sm text-ink-subtle">{school.tagline}</p>
          </div>

          <div className="mt-8 rounded-2xl border border-line bg-white p-7 shadow-sm">
            {children}
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-ink-subtle">
            Student records are confidential and access is logged.
            <br />
            Need help? Call{" "}
            <a href={school.phoneHref} className="underline hover:text-navy-700">
              {school.phone}
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
