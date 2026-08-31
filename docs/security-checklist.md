# Security & FERPA checklist

This system holds **minors' medical and behavioral records**. Treat it accordingly.

## Done

- [x] **Authorization inside the DAL, called by every protected page and action.**
      `proxy.ts` is optimistic UX only — Server Actions are reachable by direct POST
      and do not reliably pass through proxy matchers.
- [x] **No auth checks in layouts** (they do not re-render on navigation).
- [x] **Argon2id** password hashing (OWASP baseline: 19 MiB, 2 passes, 1 lane).
- [x] **Revocable stateless sessions** via `sessionEpoch`.
- [x] **httpOnly / SameSite=Lax / Secure-in-production** session cookie, 8-hour life.
- [x] **Account-enumeration defences**: one error message for all auth failures, plus
      decoy-hash timing equalisation on the unknown-email path. The reset form is the
      sharper case — it takes an address from an anonymous caller — so it returns an
      identical response for known, unknown, deactivated *and rate-limited* addresses.
      Note the deliberate inconsistency with `/login`, which states a lockout plainly:
      there the attacker already knows they made the attempts, whereas a per-email
      limit only trips for an address someone is targeting, so admitting it would
      confirm the address is worth targeting.
- [x] **No credential is ever emailed.** Not a generated password, not a temporary
      one. Access arrives only as a time-limited, single-use link whose raw value is
      stored nowhere — including the retry queue, which reset mail deliberately opts
      out of via `doNotPersist` (`lib/email/send.ts`) so a failed send cannot park a
      working token in the database.
- [x] **Rate limiting** per email and per IP, MongoDB TTL-backed (no Redis).
- [x] **No open redirect** — no `?next=` parameter; login routes by role.
- [x] **Sign-out is a POST**, not a GET link.
- [x] **Audit log covers reads as well as writes**, with a `subjectId` index to answer
      "who has seen this student's record?".
- [x] **Soft delete only** — seven-year retention per Document 6 §6.1.
- [x] **Explicit projections** on every user query; `passwordHash` never loaded into a
      value that could be returned or logged.
- [x] **Secrets fail fast** — `lib/env.ts` throws at startup, not at request time.
- [x] **`SESSION_SECRET` and `FORM_HMAC_SECRET` are separate**, so a leak of the
      lower-value form secret cannot mint admin sessions.
- [x] **`.env*` git-ignored** (`!.env.example` excepted); nothing sensitive tracked.
- [x] **Security headers**: `X-Content-Type-Options`, `X-Frame-Options: DENY`,
      `Referrer-Policy`, `Permissions-Policy`, HSTS, `Cross-Origin-Opener-Policy`.
- [x] **`validateRSCRequestHeaders: true`** — closes the RSC cache-confusion class.
- [x] **`serverActions.allowedOrigins`** pinned to the production host.
- [x] **`bodySizeLimit` left at 1 MB** — raising it raises the cost of an abusive POST.
- [x] **Zero `npm audit` vulnerabilities.** Next 16.2.1 → 16.3.0 cleared 23 HIGH
      advisories including proxy-bypass and server-function-disclosure.
- [x] **Removed `public/OfficeSetup.exe`** — a 7.4 MB Microsoft installer that was
      committed to the repo and **served publicly** at `/OfficeSetup.exe`.
- [x] **`/admin`, `/portal`, `/login` excluded in `robots.ts`** and marked
      `robots: { index: false }`.
- [x] **Admin seeding is a script, never a route.**
- [x] **Generic client-facing errors**; real detail only to the server log. A raw
      driver error can contain the connection string.
- [x] **Constant-time comparison** (`safeCompare`) for non-password secrets.

## Outstanding — before public deploy

- [ ] **Content-Security-Policy.** Omitted rather than half-done: Next injects inline
      scripts for hydration and RSC payloads, so a correct policy needs nonce
      plumbing through the proxy, and a CSP that breaks hydration is worse than none.
      This Next line also carried a CSP-nonce XSS advisory (fixed in the pinned
      version), so build it against current guidance and **test it**.
- [ ] **Force password change on first sign-in** for seeded accounts.
- [ ] **Rotate the seeded admin password** — it was printed to a terminal.
- [ ] **Atlas hardening**: restrict Network Access to known IPs (not `0.0.0.0/0`),
      confirm the database user has `readWrite` on one database only, enable
      encryption at rest, turn on backups.
- [ ] **Verify `NEXT_PUBLIC_SITE_URL`** is the real production origin — it feeds
      `allowedOrigins`, canonical URLs, and email links.
- [x] **Password reset flow** — `/forgot-password` → emailed one-hour, single-use,
      hash-at-rest token → `/reset-password`. Bumps `sessionEpoch`, so a reset also
      evicts an attacker's live session. Responds identically for known, unknown and
      throttled addresses. See `docs/auth-model.md` for the full property table.
- [ ] Consider MFA for the `admin` role.
- [ ] Decide audit-log retention and access (who may read it, for how long).

## Decisions made deliberately

**Atlas encryption-at-rest is sufficient; no app-level field encryption.**
Encrypting medical fields in the application would break the search and sort the
admin UI needs on exactly those fields, and introduces key management as a new
failure mode. Revisit only if the school stores clinical records beyond the
handbook's scope.

**No public file uploads in v1.** Immunization records are collected at the intake
meeting that already exists as step 2 of admissions (Document 4 §4.2). Accepting
minors' medical documents through an unauthenticated endpoint is the highest-risk
surface in this build for the least benefit. Staff attach documents through an
authenticated route (GridFS, session-checked retrieval, never a public URL).

**Audit writes never throw.** Availability over guaranteed completeness — a parent
must not be unable to enroll because the audit collection blipped. A provably
gap-free trail would need the audit entry inside the same transaction as the
mutation.

**Fixed-window rate limiting.** Permits a burst of up to 2× the limit across a window
boundary. Acceptable for login and form abuse at this scale.

## Rules for anyone adding code

1. **First line of a protected server action is a DAL call.** Before parsing input.
2. **Never trust a client-supplied id for scope.** Compute scope from the stored user
   document.
3. **Never put medical or behavioral detail** in an email body, a log line, an error
   message, or `auditLog.meta`.
4. **Never return a raw Mongo document to a client.** Shape it through `lib/dto`.
5. **Never add an auth check to a layout.**
6. **Public submissions write to `enrollmentApplications`, never to `students`.**
7. **Bump `CONSENT_VERSION`** when the enrollment agreement wording changes.
