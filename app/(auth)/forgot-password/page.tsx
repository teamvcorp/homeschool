import type { Metadata } from "next";
import ForgotPasswordForm from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  // Never in search results, and never followed. Same reasoning as /login.
  robots: { index: false, follow: false },
};

/**
 * "I cannot sign in" — the entry point to the reset flow.
 *
 * Public and unauthenticated by necessity: the whole point is that the visitor has no
 * session and cannot get one. Every abuse control therefore lives in the action
 * (`requestPasswordResetAction`), which is also the only thing a direct POST can reach.
 *
 * A Server Component wrapping the client form, so the only JavaScript this route ships is
 * the form itself.
 */
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
