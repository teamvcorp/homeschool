import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { can } from "@/lib/auth/roles";
import {
  listApplications,
  countApplicationsByStatus,
  parseApplicationStatus,
} from "@/lib/queries/records";
import { toApplicationListItem } from "@/lib/dto";
import { APPLICATION_STATUSES } from "@/lib/db/enums";
import SecureHeader from "@/app/components/secure/SecureHeader";
import { ADMIN_NAV } from "@/app/components/secure/nav";

export const metadata: Metadata = {
  title: "Applications",
  robots: { index: false, follow: false },
};

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-gold-100 text-gold-800",
  intakeScheduled: "bg-crest-blue-100 text-crest-blue-700",
  assessed: "bg-crest-blue-100 text-crest-blue-700",
  accepted: "bg-crest-green-100 text-crest-green-700",
  enrolled: "bg-crest-green-100 text-crest-green-700",
  declined: "bg-navy-100 text-navy-700",
  withdrawn: "bg-navy-100 text-navy-700",
};

/**
 * Enrollment application inbox.
 *
 * Auth is enforced here in the page, not in the layout — layouts do not re-render on
 * navigation, so a check there would run once and never again.
 *
 * Rows are DTOs carrying no medical fields and no date of birth: an inbox list has no
 * business loading a child's health history, and this screen is the one most likely to
 * be open on a shared monitor.
 *
 * `searchParams` is a Promise in Next 16 and must be awaited.
 */
export default async function ApplicationsPage({
  searchParams,
}: PageProps<"/admin/applications">) {
  const user = await requireUser();
  if (user.role === "parent") redirect("/portal");
  if (!can(user.role, "applications:read")) redirect("/admin");

  const { status } = await searchParams;
  // Narrowed before it reaches a query: an unrecognised value becomes "no filter"
  // rather than a filter that matches nothing and looks like an empty inbox.
  const activeStatus = parseApplicationStatus(status);

  const [docs, counts] = await Promise.all([
    listApplications(activeStatus),
    countApplicationsByStatus(),
  ]);
  const applications = docs.map(toApplicationListItem);

  return (
    <>
      <SecureHeader user={user} nav={ADMIN_NAV} />

      <main
        id="main"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8"
      >
        <h1 className="font-serif text-3xl font-bold text-navy-900">
          Enrollment applications
        </h1>
        <p className="mt-2 leading-relaxed text-ink-muted">
          Submissions from families. Nothing here is a student record until you promote
          it.
        </p>

        {/* Status filter */}
        <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/admin/applications"
            aria-current={!activeStatus ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              !activeStatus
                ? "bg-navy-800 text-white"
                : "border border-line bg-white text-ink-muted hover:border-navy-300"
            }`}
          >
            All ({docs.length === 0 && !activeStatus ? 0 : Object.values(counts).reduce((a, b) => a + b, 0)})
          </Link>
          {APPLICATION_STATUSES.filter((s) => (counts[s] ?? 0) > 0).map((s) => (
            <Link
              key={s}
              href={`/admin/applications?status=${s}`}
              aria-current={activeStatus === s ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeStatus === s
                  ? "bg-navy-800 text-white"
                  : "border border-line bg-white text-ink-muted hover:border-navy-300"
              }`}
            >
              {s} ({counts[s]})
            </Link>
          ))}
        </nav>

        {applications.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-line bg-white p-10 text-center">
            <h2 className="font-serif text-lg font-bold text-navy-900">
              No applications {activeStatus ? `with status "${activeStatus}"` : "yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md leading-relaxed text-ink-muted">
              New submissions from the public enrollment form appear here, and you will
              also receive an email for each one.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Enrollment applications, newest first
              </caption>
              <thead>
                <tr className="bg-navy-800">
                  <th scope="col" className="px-4 py-3 font-semibold text-white">
                    Student
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-white">
                    Guardian
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-white">
                    Submitted
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-white">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-white">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id} className="border-t border-line even:bg-surface-muted">
                    <th scope="row" className="px-4 py-3 text-left font-semibold text-navy-900">
                      {a.studentLegalName}
                      <span className="block text-xs font-normal text-ink-subtle">
                        {a.gradeLevel}
                        {a.requestedCohort ? ` · requested ${a.requestedCohort}` : ""}
                      </span>
                    </th>
                    <td className="px-4 py-3 text-ink-muted">
                      {a.guardianName}
                      <span className="block text-xs text-ink-subtle">
                        {a.guardianPhone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {new Date(a.submittedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {a.emailStatus === "failed" ? (
                        <span
                          className="mt-1 block text-xs font-semibold text-crest-red-600"
                          title="The confirmation email did not send. The application is safely stored."
                        >
                          email failed
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                          STATUS_STYLES[a.status] ?? "bg-navy-100 text-navy-700"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/applications/${a.id}`}
                        className="font-semibold text-navy-700 underline hover:text-navy-900"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
