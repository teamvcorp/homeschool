# Authentication & authorization model

Own auth: Argon2id password hashing, `jose`-signed JWT in an httpOnly cookie, and a
Data Access Layer that is the single place access is decided. No third-party auth
service holds accounts.

## The layers, and which one you can trust

| Layer | File | Trustworthy? |
|---|---|---|
| Optimistic route gate | `proxy.ts` | **No.** UX only. |
| Session signing/verification | `lib/auth/session.ts` | Proves *we minted the token*. Nothing more. |
| **Data Access Layer** | **`lib/dal.ts`** | **Yes. This is the boundary.** |
| Capability table | `lib/auth/roles.ts` | Pure logic, no I/O. |

**Rule: the first statement of every protected server action is a DAL call.** Before
parsing input, before touching the database. Server Actions are reachable by direct
POST — a `curl` never passes through a proxy-guarded route.

**Rule: never put an auth check in a layout.** Layouts do not re-render on
navigation, so the check runs once and then never again.

## Why the database is consulted on every request

A valid signature only proves the token is ours. It says nothing about whether the
account was since deactivated, demoted, or had its password changed. So
`verifySession()` also loads the user and rejects the token if:

- the user no longer exists, is `active: false`, or is archived
- `user.sessionEpoch !== payload.epoch`
- `user.role !== payload.role` (a stale token must not carry old privileges)

React `cache()` dedupes this to **one verification and one query per request**, no
matter how many pages, layouts, and actions ask.

### `sessionEpoch` — how a stateless token becomes revocable

`UserDoc.sessionEpoch` is an integer mirrored into the JWT's `epoch` claim.
Incrementing it invalidates **every outstanding session** for that user. Call
`revokeUserSessions(userId)` on:

- password change
- role change
- deactivation
- any suspected compromise

Without this, a stolen token stays valid until expiry regardless of what an admin
does.

## Roles and capabilities

Authorization is expressed as **capabilities**, not `role === "admin"` comparisons.
The mapping is one table in `lib/db/enums.ts` (`ROLE_CAPABILITIES`), so adding a
fourth role means editing one row rather than auditing every call site.

| Role | Scope |
|---|---|
| `admin` | Head of School. Everything. |
| `instructor` | Record entry for **assigned** students. No financials, no user management, no application decisions. |
| `parent` | Read-only, **their own children only**. |

### Two independent gates for student data

`requireStudentAccess(studentId, mode)` checks both:

1. **Capability** — may this *role* read/write student records at all?
2. **Scope** — is *this* student within the caller's reach?

Scope is computed from `assignedStudentIds` / `studentIds` on the **stored user
document**, never from request input, so a tampered form field or URL segment cannot
widen it.

## Session cookie

`va_session` — `httpOnly`, `secure` (production only), `sameSite: 'lax'`,
`path: '/'`, 8-hour expiry.

- `httpOnly` keeps it out of reach of any XSS that gets a foothold.
- `secure` is conditional because a `secure` cookie is dropped over plain HTTP,
  which would break local development entirely.
- `lax` still sends the cookie on top-level navigation (so an emailed portal link
  works) while blocking cross-site POSTs.
- 8 hours ≈ one school day.

`.set`/`.delete` on cookies are **only** legal inside a Server Action or Route
Handler. Next throws if you try during a Server Component render.

## Login hardening

Implemented in `lib/actions/auth.ts`:

- **One error message for every failure.** Wrong password, unknown email, and
  deactivated account are indistinguishable. Anything more specific is an
  account-enumeration oracle — a way to confirm which parents have accounts here,
  which is both a privacy leak and a phishing target list.
- **Timing equalisation.** When no user is found we still verify against a decoy
  hash (`getDecoyHash()`). Otherwise the unknown-email path returns instantly while
  a real email spends ~50 ms hashing — a timing oracle that enumerates accounts.
- **Rate limiting**, per email (5 / 15 min) *and* per IP (20 / 15 min). Per-email is
  tighter because a targeted attack on one account is the greater risk and a whole
  family may share one IP. Cleared on successful login.
- **No `?next=` redirect parameter.** Reflecting a caller-supplied path into a
  post-login redirect is an open redirect. Login routes by role instead.
- **Sign-out is a POST**, not a GET link — a GET logout can be triggered by any
  `<img>` on any page the user visits.

### Rate limiting without Redis

Fixed-window counters in the `rateLimits` collection with a TTL index on
`expiresAt` (`expireAfterSeconds: 0`). A single atomic `findOneAndUpdate` per
attempt; the TTL monitor does expiry for free.

Why not in-memory: serverless functions do not share memory and every cold start
gets a fresh map, so an in-memory limiter on Vercel is decorative.

Known limitation: fixed windows permit a burst of up to 2× the limit spanning a
window boundary. Acceptable here; revisit if this ever needs to survive real
volume.

## The first admin

`npm run seed:admin -- --email you@example.com --name "Your Name"`

A **script, never a route**. A "create the first admin" endpoint is a backdoor
someone eventually forgets to remove, and one that is trivially findable. Running
this requires shell access to the machine holding the database credentials, which is
the right bar.

The password is *generated*, not passed as an argument — an argument lands in shell
history and process listings. It is printed once and stored only as an Argon2id
hash.

## Argon2id parameters

19 MiB memory, 2 passes, 1 lane (OWASP baseline). Cost parameters are encoded into
the hash string, so raising them later is safe — existing hashes keep verifying.

Note: the algorithm constant is the literal `2`, not `Algorithm.Argon2id`, because
the package declares `Algorithm` as an ambient `const enum` and TypeScript forbids
reading those under `isolatedModules` (which Next enables).

## Verified working

| Test | Result |
|---|---|
| `/admin`, `/portal` with no session | 307 → `/login` |
| Wrong password | Rejected, no cookie, audit row written, rate-limit counter incremented |
| Correct password | 303 + cookie with `HttpOnly; SameSite=Lax` |
| Valid session → `/admin` | 200, renders with real user + live counts |
| **Tampered token** (one char changed) | **307 → `/login`** — DAL rejected it |
| **Garbage token** | **307 → `/login`** |
| Successful login | Per-email rate-limit counter cleared |
| No-JS form submission | Works — real `<form>` + server action |

## Still to do

- [ ] Force password change on first sign-in for seeded accounts
- [ ] Content-Security-Policy (see `docs/security-checklist.md`)
- [ ] Password change / reset flow
- [ ] Admin UI for creating instructor and parent accounts

## Verification results

Two automated end-to-end suites drive the real server actions over the
no-JavaScript path. **64 checks, all passing.**

### Enrollment funnel (20/20)

Wizard walk, plus: 7-of-8 acknowledgments rejected · honeypot rejected · sub-2-second
submission rejected · signature without intent affirmation rejected · draft cookie
cleared after submit · confirmation page contains no student name · deep-link without a
draft redirects.

### Admin & authorization boundaries (44/44)

Anonymous access to `/admin`, `/admin/applications`, `/admin/students`, `/portal` all
redirect · full status machine walk · **illegal status transition refused** ·
countersign form removed after signing (no overwrite) · **promote form gone after
promotion (no double-create)** · all four record templates write and display ·
out-of-range behavior level refused · nonexistent student id 404s.

Scope isolation, the checks that matter most:

- **A parent CANNOT read an unlinked student** → 404
- **A parent CANNOT read an unlinked agreement** → 404
- A parent cannot reach the admin student view → 307
- A parent is redirected away from the applications inbox → 307

### Two real bugs these suites caught

1. **Rate limiting scoped wrongly.** Step saves shared the strict submit policy (5/hour),
   so a family completing six steps was locked out mid-agreement. Split into
   `ENROLL_STEP_PER_IP` (120/hour) and `ENROLL_SUBMIT_PER_IP` (6/hour) — the expensive,
   irreversible operation is the submit, and that is what deserves the tight limit.
2. **Drafts stored post-transform values.** Date fields are `z.string().transform(→ Date)`,
   so storing `parsed.data` put `Date` objects in the draft; the final whole-agreement
   re-validation then failed with "expected string, received Date" *after* the family had
   filled everything in. Drafts now hold raw input; applications hold validated output.

Both were invisible to typecheck, lint, and build. They only surfaced by driving the
actual flow.
