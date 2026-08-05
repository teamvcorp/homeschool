import type { Metadata } from "next";
import { ObjectId } from "mongodb";
import { requireUser } from "@/lib/dal";
import { studentsCollection } from "@/lib/db/collections";
import { school } from "@/lib/site";
import Link from "next/link";
import SecureHeader from "@/app/components/secure/SecureHeader";
import { PORTAL_NAV } from "@/app/components/secure/nav";

export const metadata: Metadata = {
  title: "Family Portal",
  robots: { index: false, follow: false },
};

/**
 * Parent portal.
 *
 * Implements the promise in Document 6 §6.1 — that families may access their
 * student's records at any time — as self-service rather than a phone call.
 *
 * SCOPING IS THE WHOLE POINT OF THIS PAGE. The student list comes from
 * `user.studentIds`, which is read from the authenticated user document by the
 * DAL. It is never taken from a query parameter, a form field, or a path segment,
 * so there is no input a guardian could tamper with to reach another family's
 * child. The per-student detail views re-check scope via requireStudentAccess() rather
 * than trusting that this page filtered correctly — two independent gates, because a
 * single one is a single point of failure for another family's child.
 */
export default async function PortalPage() {
  const user = await requireUser();

  const students = await studentsCollection();

  // Empty studentIds must not become an unfiltered query. `$in: []` matches
  // nothing, which is the correct and safe result — but being explicit here means
  // a future refactor cannot accidentally turn "no children" into "all children".
  const ids = user.studentIds.filter(ObjectId.isValid).map((id) => new ObjectId(id));
  const myStudents =
    ids.length > 0
      ? await students
          .find(
            { _id: { $in: ids }, archivedAt: null },
            {
              // Deliberately narrow: a list view has no business loading medical
              // detail or behavioral notes.
              projection: {
                legalName: 1,
                gradeLevel: 1,
                cohort: 1,
                status: 1,
                enrollmentStartDate: 1,
              },
            },
          )
          .toArray()
      : [];

  return (
    <>
      <SecureHeader user={user} nav={PORTAL_NAV} />

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl font-bold text-navy-900">
          Family portal
        </h1>
        <p className="mt-2 leading-relaxed text-ink-muted">
          Your student&rsquo;s records, available to you at any time.
        </p>

        {myStudents.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-line bg-white p-8 text-center">
            <h2 className="font-serif text-lg font-bold text-navy-900">
              No students linked to your account yet
            </h2>
            <p className="mx-auto mt-2 max-w-md leading-relaxed text-ink-muted">
              If your enrollment was recently accepted, records appear here once
              the Head of School completes setup. If you think this is wrong,
              please call us.
            </p>
            <a
              href={school.phoneHref}
              className="mt-4 inline-block font-semibold text-navy-700 underline hover:text-navy-900"
            >
              {school.phone}
            </a>
          </div>
        ) : (
          <ul className="mt-8 grid list-none grid-cols-1 gap-5 sm:grid-cols-2">
            {myStudents.map((student) => (
              <li key={student._id.toString()}>
                <Link
                  href={`/portal/students/${student._id.toString()}`}
                  className="block rounded-2xl border border-line bg-white p-6 transition-shadow hover:shadow-lg"
                >
                <h2 className="font-serif text-xl font-bold text-navy-900">
                  {student.legalName}
                </h2>
                <dl className="mt-3 flex flex-col gap-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-ink-subtle">Grade:</dt>
                    <dd className="text-ink">{student.gradeLevel}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-ink-subtle">Cohort:</dt>
                    <dd className="text-ink capitalize">{student.cohort}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-ink-subtle">Status:</dt>
                    <dd className="text-ink capitalize">{student.status}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm font-semibold text-navy-700">
                  View records &rarr;
                </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 rounded-xl border border-navy-200 bg-navy-50 p-5">
          <p className="text-sm leading-relaxed text-ink">
            Open a student to see attendance, skills mastered, pivotal behavior progress,
            Taekwondo rank history, and a printable copy of your signed enrollment
            agreement. Records are retained for at least seven years, and access to them
            &mdash; including yours &mdash; is logged.
          </p>
        </div>
      </main>
    </>
  );
}
