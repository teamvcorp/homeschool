# Verification

How this project is tested, and the traps that make test results lie.

There is no test-runner dependency. Verification is a set of plain scripts that drive
**real server actions over the no-JavaScript progressive-enhancement path** — the same
requests a browser with JS disabled would send. That choice is deliberate: it exercises
validation, authorization, and the redirect chain end to end, and it is the only way to
prove the no-JS path still works, which the enrollment funnel promises.

## Running everything

```bash
# Terminal 1 — server pointed at the TEST database
npm run dev:test

# Fixture accounts the product cannot create yet, and a clean limiter.
# Run this BEFORE EVERY suite run — see the rate-limit trap below.
npm run seed:test-fixtures -- --clear-rate-limits

# Terminal 2
npm run check:email                          # no server or database needed
E2E_ADMIN_PASSWORD='...' npm run e2e         # all five harnesses
```

Individual harnesses run standalone — each seeds its own fixtures:

```bash
E2E_ADMIN_PASSWORD='...' node scripts/e2e/verify-promote.mjs
```

Plus the static gates, which catch more than they look like they do:

```bash
npm run typegen     # regenerate PageProps/LayoutProps — run FIRST after adding a route
npm run typecheck
npm run lint
npm run build       # must pass with .env.local ABSENT (see the env trap below)
```

## What each script covers

| Script | Proves |
|---|---|
| `scripts/check-school-email.ts` | The school email rule, with no database. Edge cases a worked example leaves open. |
| `scripts/e2e/verify-enroll.mjs` | The eight-step funnel, all 8 acknowledgments enforced, honeypot, minimum fill time, signature intent, no student name on the confirmation page. |
| `scripts/e2e/verify-bugfix.mjs` | The two bugs reported from production: autofill-triggered honeypot rejection, and sibling carry-over. Includes what must NOT carry over. |
| `scripts/e2e/verify-admin.mjs` | Application review, the status machine, countersignature, promotion, all four record templates, and every authorization boundary including cross-family scope. |
| `scripts/e2e/verify-promote.mjs` | The promote trap, school ID assignment, school email generation and mailbox status. |
| `scripts/e2e/verify-agreement.mjs` | The printable executed agreement renders with its evidence envelope and refuses unauthorized readers. |

## The database rule

**Point local work at `va_school_test`.** `.env.local` sets `MONGODB_DB=va_school_test`,
and `npm run dev:test` forces it regardless.

This is not hygiene, it is a scar. A destructive test helper was once run against the
**live** database and destroyed a real family's enrollment application. The audit log
proved it happened but holds no PII by design, so it was unrecoverable.

Consequences now baked in:

- `scripts/seed-test-fixtures.ts` **hard refuses** any database not named
  `va_school_test`. Not a warning, not a `--force` flag. The check is on the resolved
  database name, because `NODE_ENV` says nothing about which cluster the URI points at.
- The e2e harnesses **refuse any non-localhost `E2E_BASE_URL`**. They create applications
  and students; pointed at production they would write fixtures into real records.
- Never write an unconditional `deleteMany({})`. If a helper needs to clear data, scope
  it to fixture-shaped documents and assert the database name first.

## Trap 1 — a harness that reads "the first id on the page" will lie to you

This cost real time, twice, and produced five confident false failures.

The admin harness used to grab the first `/admin/applications/<id>` match on the list
page, then assert on fixture values like `Peanut allergy`. That works exactly once.
Afterwards:

- Running any other harness first put a **newer** application at the top, so the
  assertions ran against a different record and failed for reasons that had nothing to
  do with the code.
- Worse, the harness **mutated** whichever record it grabbed — advancing its status,
  countersigning it, promoting it.
- The student roster had the same flaw one layer down, so `School ID shows as unassigned
  initially` failed against a student that a previous run had already given an ID.

**Every harness now seeds its own fixture and every fixture value is unique per run**
(`Date.now().toString(36)`), and ids are resolved by proximity to that unique name rather
than by position. Preserve both properties.

Note the two admin tables disagree on layout, which is why the id lookup searches both
directions: the student roster wraps the name in its link (id **before** the name), while
the applications table puts a trailing "Review" link in the last cell (id **after**).

## Trap 2 — partial unique indexes make fixed fixtures unrepeatable

`students.schoolId` and `students.schoolEmail` both carry **partial unique** indexes.
So a fixed fixture cannot be re-promoted:

- The second student with the same name and birthday correctly collides on the email and
  resolves to `lily16v13.2@vaschool.org`.
- The same school ID cannot be assigned twice at all.

This is why the canonical email example is asserted in `check-school-email.ts` — no
database, nothing to collide with — while the e2e harness proves only the *wiring*
(promotion generates an address, stores it, marks it pending).

## Trap 3 — `next build` then `next dev` in the same tree gives spurious 404s

Running `npm run build` and then `next dev` leaves dev reading a partial manifest.
Symptom: `/` returns 200 and **every other route 404s**, which reads exactly like a
catastrophic routing regression.

```bash
rm -rf .next && npm run dev
```

If routes 404 in dev but the production build lists them, this is the cause. Check the
build output first — it enumerates every route it compiled.

## Trap 4 — the build must pass with no `.env.local`

Vercel builds with no `.env.local`, and an eager `zod` parse of the environment at module
scope runs during page-data collection, failing the build with a missing `SESSION_SECRET`.
`lib/env.ts` therefore validates **lazily** behind a Proxy.

Regression test: `npm run build` must succeed with `.env.local` renamed away.

## Trap 5 — driving server actions by hand needs four fields, verbatim

A form post to a server action must carry, exactly as rendered:

```
$ACTION_REF_<n>      (empty value)
$ACTION_<n>:0        the action id       — VERBATIM
$ACTION_<n>:1        the bound arguments — VERBATIM
$ACTION_KEY          — omitting this makes the action silently not execute
```

Rebuilding the bound reference instead of echoing it only appears to work when the form
is first on the page. Omitting `$ACTION_KEY` produces a 500 with a suspiciously short
`application-code` time and a "Connection closed" message — the action never ran.

`findForm()` in each harness captures all four. Reuse it rather than reinventing it.

## Trap 6 — the suite exhausts its own rate limits

The public enrollment submit is capped **per IP per hour** and **per guardian email per
day**. A full suite run makes five real submissions from one address, so running it twice
in an hour trips the limiter and the later harnesses fail with:

> We have received several submissions from your connection recently. Please wait a little
> while, or call the school and we will help directly.

That is **the app working correctly**, reported as a test failure. It cost real time to
diagnose, because a rejected server action returns `200` with the form redisplayed — the
status alone says "refused" without saying why.

Two mitigations, both now in place:

- `npm run seed:test-fixtures -- --clear-rate-limits` resets the counters. Safe: every
  `rateLimits` document carries a TTL and would expire on its own, so nothing is a record
  of anything. Deliberately opt-in, so it cannot silently mask a limiter regression.
- Every harness uses a **per-run guardian email** (`promote-test+<run>@example.com`), so
  the per-email daily cap cannot accumulate across runs.

Each harness also now prints the server's own error text via `serverError()` when a
submit is refused. If you add a harness that submits, use it — never report a bare
`status=200`.

## A finding worth knowing: middle names change the school email

The rule is *first name + day of birth + first letter of last name + 2-digit year*.
Implemented as stated, everything after the given name is the surname — so a **middle
name supplies the initial**:

| Legal name | Born | Address |
|---|---|---|
| Lily Von Der Becke | 16 Mar 2013 | `lily16v13@vaschool.org` ✅ the school's example |
| Mary Jane Watson | 31 Dec 2009 | `mary31j09@vaschool.org` — **J from Jane**, not W |

This is correct for `Von Der Becke` (initial `V`, from the first surname token) and
surprising for anyone entered with a middle name. If the school wants surname-initial to
mean the *final* token, that is a one-line change in `lib/school-email.ts` — but it would
then produce `B` for Von Der Becke and break their stated example. Ask before changing.

Mononyms produce `null`, and callers must handle it rather than invent a letter.

## Current status

Last full run — all five harnesses green in a single `npm run e2e`, **134 checks**, plus
17 in the database-free email check:

| Suite | Result |
|---|---|
| `check:email` | 17 / 17 |
| `verify-enroll` | 20 / 20 |
| `verify-bugfix` | 28 / 28 |
| `verify-admin` | 45 / 45 |
| `verify-promote` | 24 / 24 |
| `verify-agreement` | 17 / 17 |
| typecheck · lint · build | clean (34 routes, 45 prerendered pages) |

## What is NOT covered

Be honest about the gaps rather than implying a green run means more than it does.

- **No browser is involved.** Client-side JS, the React Compiler output, hydration, and
  focus management are unverified by these scripts. The no-JS path is what is proven.
- **No visual or accessibility regression testing.** Contrast ratios in
  `design-system.md` are design targets checked by hand, not asserted.
- **Email delivery is not exercised** against Resend. The failure path (application still
  saves, `emailStatus: 'failed'`) is what matters and is covered by the admin view.
- **No load or concurrency testing.** Idempotency is checked with a rapid double submit,
  not with genuine parallelism.
- **`/portal` is still in the tree** and still covered by the admin harness's scope
  checks, even though the app is intended to be enrollment-only. See the division of
  intent on `dailyApp` in `lib/site.ts`.
