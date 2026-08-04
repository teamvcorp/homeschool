/**
 * Shell for authenticated areas (/admin and /portal).
 *
 * ⚠️  THERE IS DELIBERATELY NO AUTH CHECK IN THIS FILE.
 *
 * Layouts do not re-render on navigation in the App Router. A check here would
 * run on first paint and then never again — so a session that expires, or a user
 * who is deactivated mid-visit, would keep seeing protected chrome as they moved
 * between pages. Worse, it reads as if the whole subtree is protected, which
 * discourages the per-page checks that actually do the work.
 *
 * Every page under here calls requireUser()/requireCapability() itself, and every
 * server action re-checks independently. proxy.ts adds an optimistic redirect so
 * a signed-out visitor never sees this shell at all.
 */
export default function SecureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex min-h-full flex-col bg-surface-muted">{children}</div>;
}
