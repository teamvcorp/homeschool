import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { can } from "@/lib/auth/roles";
import { listInquiries, countInquiriesByStatus, parseInquiryStatus } from "@/lib/queries/records";
import { toInquiryListItem } from "@/lib/dto";
import { INQUIRY_STATUSES, INQUIRY_TYPE_LABELS, type InquiryType } from "@/lib/db/enums";
import SecureHeader from "@/app/components/secure/SecureHeader";
import { ADMIN_NAV } from "@/app/components/secure/nav";

export const metadata: Metadata = {
  title: "Inquiries",
  robots: { index: false, follow: false },
};

const STATUS_STYLES: Record<string, string> = {
  new: "bg-gold-100 text-gold-800",
  contacted: "bg-crest-blue-100 text-crest-blue-700",
  closed: "bg-navy-100 text-navy-700",
};

/**
 * The inquiry inbox.
 *
 * WHY THIS PAGE EXISTS: the Homeschool at Home interest form is the first thing in this
 * codebase that writes an `inquiries` row. Without a screen, every submission would be
 * invisible — the dashboard's "Open inquiries" count would climb forever, nothing could
 * move a row off `status: "new"`, and the only copy of a family's details would be one
 * notification email. A sales lead that lives only in an inbox is a sales lead that gets
 * lost.
 *
 * ⚠️  ADMIN ONLY, GATED ON `financials:read`, WHICH IS DELIBERATE AND NOT AN OVERSIGHT.
 * `applications:read` would have been the obvious pick, but instructors hold it, and an
 * inquiry row carries a family's name, email, phone, town and circumstances before they
 * are anyone's student. A Homeschool at Home row additionally exists to set up billing,
 * which is squarely `financials:read` — held by admin alone (see ROLE_CAPABILITIES).
 *
 * If the school later wants instructors to see instructor/volunteer inquiries, that is a
 * FILTERED view and its own decision — not a loosening of this gate.
 *
 * Auth is enforced here in the page, not in the layout: layouts do not re-render on
 * navigation, so a check there would run once and never again.
 *
 * READ-ONLY IN THIS PASS. There is no "mark contacted" action yet, so `contacted` and
 * `closed` are reachable only by a direct database edit. That is a known gap, and the
 * filter renders those statuses so the screen is already correct when the action lands.
 */
export default async function InquiriesPage({
  searchParams,
}: PageProps<"/admin/inquiries">) {
  const user = await requireUser();
  if (user.role === "parent") redirect("/portal");
  if (!can(user.role, "financials:read")) redirect("/admin");

  const { status } = await searchParams;
  // Narrowed before it reaches a query: an unrecognised value becomes "no filter" rather
  // than a filter matching nothing, which would render an empty inbox that looks like
  // "no inquiries" instead of "bad filter".
  const activeStatus = parseInquiryStatus(status);

  const [docs, counts] = await Promise.all([
    listInquiries(activeStatus),
    countInquiriesByStatus(),
  ]);
  const inquiries = docs.map((doc) =>
    toInquiryListItem(doc, INQUIRY_TYPE_LABELS[doc.type as InquiryType] ?? doc.type),
  );
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <SecureHeader user={user} nav={ADMIN_NAV} />

      <main
        id="main"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8"
      >
        <h1 className="font-serif text-3xl font-bold text-navy-900">Inquiries</h1>
        <p className="mt-2 leading-relaxed text-ink-muted">
          Tours, volunteers, partnerships, and Homeschool at Home sign-ups. None of these
          is an enrollment application — a Homeschool at Home family is an independent
          homeschooler, not a student here.
        </p>

        {/* Status filter */}
        <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/admin/inquiries"
            aria-current={!activeStatus ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              !activeStatus
                ? "bg-navy-800 text-white"
                : "border border-line bg-white text-ink-muted hover:border-navy-300"
            }`}
          >
            All ({total})
          </Link>
          {INQUIRY_STATUSES.filter((s) => (counts[s] ?? 0) > 0).map((s) => (
            <Link
              key={s}
              href={`/admin/inquiries?status=${s}`}
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

        {inquiries.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-line bg-white p-10 text-center">
            <h2 className="font-serif text-lg font-bold text-navy-900">
              No inquiries {activeStatus ? `with status "${activeStatus}"` : "yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md leading-relaxed text-ink-muted">
              Homeschool at Home sign-ups appear here, and you will also receive an email
              for each one.
            </p>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {inquiries.map((inquiry) => (
              <li
                key={inquiry.id}
                className="rounded-2xl border border-line bg-white p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-navy-900">
                      {inquiry.name}
                    </h2>
                    <p className="mt-1 text-sm text-ink-subtle">
                      <a
                        href={`mailto:${inquiry.email}`}
                        className="font-medium text-navy-700 underline hover:text-navy-900"
                      >
                        {inquiry.email}
                      </a>
                      {inquiry.phone ? (
                        <>
                          {" · "}
                          <a
                            href={`tel:${inquiry.phone.replace(/[^\d+]/g, "")}`}
                            className="font-medium text-navy-700 underline hover:text-navy-900"
                          >
                            {inquiry.phone}
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-block rounded-full bg-navy-100 px-2.5 py-1 text-xs font-semibold text-navy-700">
                      {inquiry.typeLabel}
                    </span>
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                        STATUS_STYLES[inquiry.status] ?? "bg-navy-100 text-navy-700"
                      }`}
                    >
                      {inquiry.status}
                    </span>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap leading-relaxed text-ink-muted">
                  {inquiry.message}
                </p>

                {Object.keys(inquiry.details).length > 0 ? (
                  <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
                    {Object.entries(inquiry.details).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <dt className="font-semibold text-navy-900">{key}</dt>
                        <dd className="text-ink-muted">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                <p className="mt-4 text-xs text-ink-subtle">
                  Received{" "}
                  {new Date(inquiry.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {inquiry.emailStatus === "failed" ? (
                    <span
                      className="ml-2 font-semibold text-crest-red-600"
                      title="The notification email did not send. The inquiry is safely stored."
                    >
                      · notification email failed
                    </span>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
