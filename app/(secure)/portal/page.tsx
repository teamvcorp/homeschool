import type { Metadata } from "next";
import { ObjectId } from "mongodb";
import { requireUser } from "@/lib/dal";
import { studentsCollection } from "@/lib/db/collections";
import { school } from "@/lib/site";
import SecureHeader from "@/app/components/secure/SecureHeader";

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
 * child. Phase 6 adds per-student detail views, each of which re-checks scope via
 * requireStudentAccess() rather than trusting that this page filtered correctly.
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
      <SecureHeader user={user} nav={[{ label: "My students", href: "/portal" }]} />

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
              <li
                key={student._id.toString()}
                className="rounded-2xl border border-line bg-white p-6"
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
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 rounded-xl border border-navy-200 bg-navy-50 p-5">
          <p className="text-sm leading-relaxed text-ink">
            Attendance, mastery progress, behavioral records, and Taekwondo rank
            history will appear here for each student. Records are retained for a
            minimum of seven years and access to them is logged.
          </p>
        </div>
      </main>
    </>
  );
}
