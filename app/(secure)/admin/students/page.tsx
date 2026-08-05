import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { can, isStudentInScope } from "@/lib/auth/roles";
import { listStudents } from "@/lib/queries/records";
import { toStudentListItem } from "@/lib/dto";
import { cohorts, categoryStyles } from "@/lib/site";
import SecureHeader from "@/app/components/secure/SecureHeader";
import { ADMIN_NAV } from "@/app/components/secure/nav";

export const metadata: Metadata = {
  title: "Students",
  robots: { index: false, follow: false },
};

/**
 * Student roster.
 *
 * SCOPE FILTERING HAPPENS HERE AS WELL AS ON THE DETAIL PAGE. An instructor sees only
 * their assigned students; an admin sees everyone. Filtering the list is a courtesy, not
 * the protection — the detail page independently calls requireStudentAccess, so a
 * guessed id gets rejected there even if this list were ever wrong.
 *
 * Rows carry no medical fields: a roster shows names and placement, nothing more.
 */
export default async function StudentsPage() {
  const user = await requireUser();
  if (user.role === "parent") redirect("/portal");

  const docs = await listStudents();

  const visible = docs
    .map(toStudentListItem)
    .filter((s) =>
      isStudentInScope(user.role, s.id, {
        assignedStudentIds: user.assignedStudentIds,
        studentIds: user.studentIds,
      }),
    );

  const cohortOf = (id: string) => cohorts.find((c) => c.id === id);

  return (
    <>
      <SecureHeader user={user} nav={ADMIN_NAV} />

      <main
        id="main"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8"
      >
        <h1 className="font-serif text-3xl font-bold text-navy-900">Students</h1>
        <p className="mt-2 leading-relaxed text-ink-muted">
          {can(user.role, "records:read:all")
            ? "All enrolled students."
            : "Students assigned to you."}
        </p>

        {visible.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-line bg-white p-10 text-center">
            <h2 className="font-serif text-lg font-bold text-navy-900">
              No student records yet
            </h2>
            <p className="mx-auto mt-2 max-w-md leading-relaxed text-ink-muted">
              Student records are created by promoting an accepted enrollment
              application &mdash; they are never entered directly, so every record traces
              back to a signed agreement.
            </p>
            <Link
              href="/admin/applications"
              className="mt-4 inline-block font-semibold text-navy-700 underline hover:text-navy-900"
            >
              Review applications
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid list-none grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((s) => {
              const cohort = cohortOf(s.cohort);
              const accent = cohort ? categoryStyles[cohort.color] : null;
              return (
                <li key={s.id}>
                  <Link
                    href={`/admin/students/${s.id}`}
                    className={`block rounded-2xl border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-lg ${
                      accent ? `border-l-4 ${accent.border}` : ""
                    }`}
                  >
                    <p
                      className={`text-xs font-bold uppercase tracking-[0.12em] ${
                        accent ? accent.text : "text-ink-subtle"
                      }`}
                    >
                      {cohort ? `${cohort.name} · ${cohort.range}` : s.cohort}
                    </p>
                    <h2 className="mt-1 font-serif text-xl font-bold text-navy-900">
                      {s.legalName}
                    </h2>
                    <dl className="mt-3 flex flex-col gap-1 text-sm">
                      <div className="flex gap-2">
                        <dt className="text-ink-subtle">Grade:</dt>
                        <dd className="text-ink">{s.gradeLevel}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-subtle">Status:</dt>
                        <dd className="capitalize text-ink">{s.status}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-subtle">School ID:</dt>
                        <dd className="text-ink">{s.schoolId ?? "—"}</dd>
                      </div>
                      {/* Shown on the roster so staff can see at a glance which mailboxes
                          still need creating in Office 365, without opening each record. */}
                      <div className="mt-1 flex flex-col gap-0.5">
                        <dt className="text-ink-subtle">School email:</dt>
                        <dd>
                          {s.schoolEmail ? (
                            <>
                              <code className="break-all text-xs text-ink">
                                {s.schoolEmail}
                              </code>
                              <span
                                className={`ml-1 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold ${
                                  s.schoolEmailStatus === "active"
                                    ? "bg-crest-green-100 text-crest-green-700"
                                    : s.schoolEmailStatus === "disabled"
                                      ? "bg-navy-100 text-navy-700"
                                      : "bg-gold-100 text-gold-800"
                                }`}
                              >
                                {s.schoolEmailStatus}
                              </span>
                            </>
                          ) : (
                            <span className="text-ink-subtle">— not issued —</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
