import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { can } from "@/lib/auth/roles";
import {
  applicationsCollection,
  studentsCollection,
  inquiriesCollection,
} from "@/lib/db/collections";
import SecureHeader from "@/app/components/secure/SecureHeader";
import { ADMIN_NAV } from "@/app/components/secure/nav";

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
 * Counts are live from the database. No student detail is loaded here, so rendering the
 * dashboard reads no medical or behavioral data and writes no per-student audit entries
 * — a page that reveals nothing about any individual should not look like it did.
 */
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

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <Link
            href="/admin/applications"
            className="rounded-2xl border border-line border-l-4 border-l-gold-400 bg-white p-6 transition-shadow hover:shadow-lg"
          >
            <h2 className="font-serif text-lg font-bold text-navy-900">
              Review applications
            </h2>
            <p className="mt-2 leading-relaxed text-ink-muted">
              Read signed agreements, advance intake status, countersign, and promote
              accepted families into student records.
            </p>
            {newApplications > 0 ? (
              <p className="mt-3 text-sm font-semibold text-gold-700">
                {newApplications} awaiting first review
              </p>
            ) : null}
          </Link>

          <Link
            href="/admin/students"
            className="rounded-2xl border border-line border-l-4 border-l-crest-blue-600 bg-white p-6 transition-shadow hover:shadow-lg"
          >
            <h2 className="font-serif text-lg font-bold text-navy-900">
              Student records
            </h2>
            <p className="mt-2 leading-relaxed text-ink-muted">
              Attendance, mastery log, pivotal behavior, and Taekwondo progression —
              Templates A through D from the accreditation package.
            </p>
          </Link>
        </div>

        {canSeeFinancials ? (
          <p className="mt-6 text-sm leading-relaxed text-ink-subtle">
            Signed in as an administrator: you can see medical detail, ESA elections, and
            signature records. Every record you open is written to the audit log.
          </p>
        ) : (
          <p className="mt-6 text-sm leading-relaxed text-ink-subtle">
            Signed in as an instructor: you can record progress for students assigned to
            you. Financial detail and account management are not available to your role.
          </p>
        )}
      </main>
    </>
  );
}
