import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import SecureHeader from "@/app/components/secure/SecureHeader";
import { ADMIN_NAV } from "@/app/components/secure/nav";
import ChangePasswordForm from "./change-password-form";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

/**
 * Your own account — currently just the password.
 *
 * ⚠️  DELIBERATELY AVAILABLE TO EVERY SIGNED-IN ROLE, not only administrators.
 *
 * It sits at /account rather than /admin/account because a parent or instructor account needs
 * this exactly as much as an administrator's does, and putting it under /admin would have
 * meant either duplicating it or denying it to the people most likely to be handed a
 * generated password by someone else.
 *
 * The auth check is HERE, in the page — not in the layout. See app/(secure)/layout.tsx for
 * why that distinction matters. `requireUser()` with no capability argument: being signed in
 * is the only authority needed to change your own password, and the action re-checks the
 * session and demands the current password regardless of what this page did.
 */
export default async function AccountPage() {
  const user = await requireUser();

  return (
    <>
      {/* Parents do not get the admin navigation; they get the header without it. */}
      <SecureHeader user={user} nav={user.role === "parent" ? [] : ADMIN_NAV} />

      <main id="main" className="mx-auto w-full max-w-2xl px-6 py-10">
        <h1 className="font-serif text-2xl font-bold text-navy-900">Your account</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Signed in as {user.email}.
        </p>

        <section className="mt-8 rounded-xl border border-line bg-white p-6">
          <h2 className="font-serif text-xl font-bold text-navy-900">Change your password</h2>
          <p className="mt-1 mb-6 text-sm text-ink-muted">
            If your password was generated for you when the account was created, change it
            now. Changing it signs out every other device using this account.
          </p>

          <ChangePasswordForm minLength={MIN_PASSWORD_LENGTH} />
        </section>

        <p className="mt-6 text-sm text-ink-muted">
          <Link href={user.role === "parent" ? "/portal" : "/admin"} className="underline">
            Back to {user.role === "parent" ? "the family portal" : "the dashboard"}
          </Link>
        </p>
      </main>
    </>
  );
}
