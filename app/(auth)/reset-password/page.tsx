import type { Metadata } from "next";
import Link from "next/link";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { peekToken } from "@/lib/auth/token";
import ResetPasswordForm from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  /**
   * `noindex` matters more here than on any other page in the app: the URL CONTAINS A
   * CREDENTIAL. A crawler that indexed it would publish a live reset link.
   *
   * The Referrer-Policy set globally in next.config.ts (`strict-origin-when-cross-origin`)
   * is the other half of this — it stops the token leaking to any third-party asset host
   * in a Referer header, because only the origin is sent cross-origin, never the query.
   */
  robots: { index: false, follow: false },
};

/**
 * Redeem a reset or setup link.
 *
 * ⚠️  `searchParams` IS A PROMISE IN NEXT 16. Awaiting it is not optional — see
 * docs/nextjs-16-conventions.md.
 *
 * WHY THE TOKEN IS CHECKED HERE *AND* AT SUBMIT
 *
 * `peekToken` reads without consuming, purely so an expired link shows an explanation
 * instead of a password form that is guaranteed to fail. It is a courtesy, not a security
 * check: the page is a GET and anyone can skip it by POSTing straight to the action. The
 * real redemption happens inside `resetPasswordAction`, atomically, which is where it has
 * to be.
 *
 * `peekToken` deliberately returns only a boolean — never whose token it is — so this
 * page cannot leak an identity before the password has actually been set.
 */
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const rawToken = typeof token === "string" ? token : "";

  const usable = rawToken ? await peekToken(rawToken, "reset") : false;

  if (!usable) {
    return (
      <div className="flex flex-col gap-5">
        <h2 className="font-serif text-xl font-bold text-navy-900">
          This link has expired
        </h2>
        <p className="text-sm leading-relaxed text-ink">
          Reset links are good for one hour and can only be used once. Request a new one
          and we will send a fresh link.
        </p>
        <Link
          href="/forgot-password"
          className="rounded-full bg-navy-800 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-navy-700"
        >
          Send a new link
        </Link>
        <Link
          href="/login"
          className="text-center text-sm font-semibold text-navy-700 underline hover:text-navy-900"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  /**
   * `minLength` is threaded as a prop rather than imported by the client component —
   * lib/auth/password.ts is `server-only` and importing it from the browser bundle pulls
   * in the Argon2id native module and breaks the build. Same pattern as
   * app/(secure)/account/page.tsx.
   */
  return <ResetPasswordForm token={rawToken} minLength={MIN_PASSWORD_LENGTH} />;
}
