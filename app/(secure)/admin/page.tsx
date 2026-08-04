import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { can } from "@/lib/auth/roles";
import {
  applicationsCollection,
  studentsCollection,
  inquiriesCollection,
} from "@/lib/db/collections";
import SecureHeader from "@/app/components/secure/SecureHeader";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Admin dashboard.
 *
 * The auth check is HERE, in the page — not in the layout. See the comment in
 * app/(secure)/layout.tsx for why that distinction matters.
 *
 * Phase 5 builds out the records screens (attendance, mastery, behavior,
 * Taekwondo, applications, instructors, partnerships). This is the shell plus the
 * live counts, so the authentication path is genuinely exercised end to end.
 */
const ADMIN_NAV = [
  { label: "Overview", href: "/admin" },
] as const;

export default async function AdminDashboardPage() {
  const user = await requireUser();

  // A parent who reaches /admin — by typing it, or via the proxy's optimistic
  // redirect — belongs in the portal instead.
  if (user.role === "parent") redirect("/portal");

  // Counts only. No student detail is loaded on a dashboard, so no medical or
  // behavioral data is read to render this page — which also means no per-student
  // audit entries for a page that reveals nothing about any individual.
  const [applications, students, inquiries] = await Promise.all([
    applicationsCollection(),
    studentsCollection(),
    inquiriesCollection(),
  ]);

  const [newApplications, enrolledStudents, openInquiries] = await Promise.all([
    applications.countDocuments({ status: "submitted" }),
    students.countDocuments({ status: "enrolled", archivedAt: null }),
    inquiries.countDocuments({ status: "new" }),
  ]);

  const canSeeFinancials = can(user.role, "financials:read");

  return (
    <>
      <SecureHeader user={user} nav={ADMIN_NAV} />

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl font-bold text-navy-900">
          Good to see you, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-2 leading-relaxed text-ink-muted">
          Records system for {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          .
        </p>

        <dl className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            {
              label: "New applications",
              value: newApplications,
              hint: "Awaiting intake scheduling",
            },
            {
              label: "Enrolled students",
              value: enrolledStudents,
              hint: "Active records",
            },
            {
              label: "Open inquiries",
              value: openInquiries,
              hint: "Tours, volunteers, partnerships",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-line bg-white p-6"
            >
              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">
                {stat.label}
              </dt>
              <dd className="mt-2 font-serif text-4xl font-bold text-navy-900">
                {stat.value}
              </dd>
              <p className="mt-1 text-sm text-ink-subtle">{stat.hint}</p>
            </div>
          ))}
        </dl>

        <div className="mt-10 rounded-2xl border border-line border-l-4 border-l-gold-400 bg-white p-6">
          <h2 className="font-serif text-lg font-bold text-navy-900">
            Records screens are being built
          </h2>
          <p className="mt-2 leading-relaxed text-ink-muted">
            The database, authentication, and audit logging are in place. The
            attendance grid, mastery log, behavioral records, Taekwondo
            progression, application review, instructor log, and employer
            partnership screens land next.
          </p>
          {canSeeFinancials ? (
            <p className="mt-3 text-sm text-ink-subtle">
              You are signed in as an administrator, so you will see tuition and
              ESA status alongside those records.
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
