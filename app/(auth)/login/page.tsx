import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  // This page must never appear in search results.
  robots: { index: false, follow: false },
};

/**
 * Sign-in page.
 *
 * A Server Component that renders the client form — so the only JavaScript this
 * route ships is the form itself.
 *
 * Note there is no `?next=` handling. Reflecting a caller-supplied path into a
 * post-login redirect is how open redirects happen; the login action routes by
 * role instead.
 */
export default function LoginPage() {
  return <LoginForm />;
}
