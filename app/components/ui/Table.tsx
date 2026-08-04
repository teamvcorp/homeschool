import type { ReactNode } from "react";

/**
 * Document-style data table. The accreditation package is full of these, so it is
 * worth having one accessible implementation rather than ten ad-hoc ones.
 *
 * Two things this gets right that hand-rolled tables usually don't:
 *  1. It wraps in an `overflow-x-auto` container, so a wide table scrolls inside
 *     itself instead of forcing the whole page to scroll sideways on mobile.
 *  2. `scope="col"` / `scope="row"` on headers, so screen readers can announce
 *     "Cohort: Middle" instead of reading a wall of disconnected cells.
 */
export function DataTable({
  caption,
  headers,
  rows,
  /** When true, the first cell of each row is treated as that row's header. */
  rowHeaders = false,
  className = "",
}: {
  /** Describes the table for screen readers. Visually hidden by default. */
  caption: string;
  headers: readonly string[];
  rows: readonly (readonly ReactNode[])[];
  rowHeaders?: boolean;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-line ${className}`}>
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-navy-800">
            {headers.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-3 font-semibold text-white first:rounded-tl-2xl last:rounded-tr-2xl"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-t border-line align-top even:bg-surface-muted"
            >
              {row.map((cell, j) =>
                rowHeaders && j === 0 ? (
                  <th
                    key={j}
                    scope="row"
                    className="px-4 py-3 text-left font-semibold text-navy-900"
                  >
                    {cell}
                  </th>
                ) : (
                  <td key={j} className="px-4 py-3 leading-relaxed text-ink-muted">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Year-over-year comparison, used for the Higher Institute's two-year framework.
 * On mobile it collapses from a table into stacked cards, because a four-column
 * table of paragraphs is unreadable at 375px.
 */
export function ComparisonTable({
  caption,
  columnLabels,
  rows,
}: {
  caption: string;
  /** [rowLabelHeader, columnA, columnB, columnC?] */
  columnLabels: readonly string[];
  rows: readonly {
    label: string;
    values: readonly string[];
  }[];
}) {
  return (
    <>
      {/* Desktop: real table. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-line md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-navy-800">
              {columnLabels.map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="px-4 py-3 font-semibold text-white first:rounded-tl-2xl last:rounded-tr-2xl"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-t border-line align-top even:bg-surface-muted"
              >
                <th
                  scope="row"
                  className="px-4 py-4 text-left font-semibold text-navy-900"
                >
                  {row.label}
                </th>
                {row.values.map((v, i) => (
                  <td key={i} className="px-4 py-4 leading-relaxed text-ink-muted">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked definition cards. */}
      <ul className="flex list-none flex-col gap-4 md:hidden">
        {rows.map((row) => (
          <li
            key={row.label}
            className="rounded-2xl border border-line bg-white p-5 shadow-sm"
          >
            <h3 className="font-serif text-lg font-bold text-navy-900">
              {row.label}
            </h3>
            <dl className="mt-3 flex flex-col gap-3">
              {row.values.map((v, i) => (
                <div key={i}>
                  <dt className="text-xs font-bold uppercase tracking-wider text-gold-600">
                    {columnLabels[i + 1]}
                  </dt>
                  <dd className="mt-1 leading-relaxed text-ink-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
