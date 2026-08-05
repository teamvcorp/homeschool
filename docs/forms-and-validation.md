# Forms, validation, and anti-abuse

## The honeypot MUST stay a checkbox

**Production incident, 2026-08-05.** The enrollment form's honeypot was a text input named
`company_website` with a matching `<label>`, parked off-screen at `left: -9999px`. Chrome and
Edge address-autofill filled it whenever a family used autofill on the guardian step — the
one step with a full address block — and the honeypot check rejected real families with:

> We could not process that submission. Please reload the page and try again — or call the
> school and we will take your details directly.

Confirmed from the Vercel runtime log:

```
[warn] [anti-abuse] honeypot filled on enroll-step
```

### What actually fixes it

1. **Use a CHECKBOX, not a text input.** Autofill engines populate text and select fields.
   They do not tick checkboxes. An unticked checkbox submits no value at all, so a false
   positive is close to impossible.
2. **Give it a semantically meaningless name.** Autofill classifies fields by name, id,
   label, and placeholder. Anything resembling `company`, `website`, `url`, `email`, `name`,
   `address`, or `phone` is a target. The field is now `va_form_confirm_x9`.

**`autocomplete="off"` is not protection.** Chrome has long ignored it for address and
payment heuristics. Off-screen positioning is not protection either — the field is still
fully visible to autofill. The input *type* is what matters.

## The governing principle: a false rejection costs more than a tolerated bot

This form is how the school enrolls students. A family part-way through a legally
significant agreement who is told "we could not process that" may simply give up, and the
school never learns they tried. The worst a bot achieves against a wizard *step* is a
disposable draft that TTL-expires in 14 days.

So the checks are deliberately asymmetric:

| Action | Honeypot | Signature valid | Staleness | Min fill time | Rate limit |
|---|---|---|---|---|---|
| Start an agreement | — | — | — | — | 40/hr per IP |
| Save a wizard step | ✓ | ✓ | ✓ | **no** | 120/hr per IP, plus 40/hr per IP when it creates a draft |
| Submit — *attempt* | ✓ | ✓ | ✓ | **yes (2s)** | 30/hr per IP |
| Submit — *stored application* | — | — | — | — | 10/hr per IP, 8/day per email |
| Outbound enrollment email | — | — | — | — | 40/day globally (never rejects a family) |

**Never enable `enforceMinFillTime` on a step save.** A family accepting a browser autofill
dropdown and clicking Save can legitimately do it in under two seconds. The floor is safe on
the final submit only, because reaching it requires passing a review page and typing a full
legal name.

### Why the submit has two limits instead of one

The tight limit is charged **after** `completeAgreementSchema` passes, immediately before the
insert. When it ran before validation, every rejected POST spent a slot: a family enrolling
four children who twice forgot the intent checkbox hit a 6/hour cap on a genuine,
fully-typed agreement and was told to phone the school mid-signature. The generous *attempt*
limit in front of it keeps that from being an unmetered loop. So:

- A mistake costs nothing.
- The application cap counts applications.

`ENROLL_SUBMIT_PER_EMAIL` is now **actually applied**. It was dead config: `checkPublicFormAbuse`
took one policy and used it for both the IP key and the email key, so the real per-email cap
was whatever the per-IP cap happened to be. It is 8/day, not the 4/day previously documented —
4 would reject the fifth child of a large family, which is the same false-rejection failure in
a different coat.

### The one limit that must never reject a family

`ENROLLMENT_EMAIL_GLOBAL_PER_DAY` is checked **after** the application is stored. On trip the
agreement is saved and its two emails are parked in the retry queue instead of being sent.

It exists because the confirmation goes to an address the submitter typed, which makes this
form a relay a stranger can point at a stranger from the school's own verified domain. The
cost of that abuse is not compute — it is the sending reputation of `fyht4.com`, which also
carries parent-portal and password-reset mail. Degrade email; never degrade the save.

## Diagnosability without a bypass oracle

The visitor-facing message is intentionally identical across the adversarial failure modes,
so an attacker gets no feedback to tune against. Every branch logs a distinct string so the
school can still diagnose a problem — this is how the autofill bug was found. Search Vercel
runtime logs for `[anti-abuse]`:

| Log line | Cause |
|---|---|
| `honeypot ticked on <scope>` | Something ticked the trap |
| `timestamp too-fast on <scope>` | Under the fill-time floor (final submit only) |
| `timestamp forged on <scope>` | HMAC mismatch — see "the secret is the other suspect" below |
| `timestamp missing on <scope>` | The hidden field is not reaching the server |
| `timestamp malformed on <scope>` | Corrupted token |
| `ip rate limit hit on <scope>` | Per-IP cap for that scope |
| `identifier rate limit hit on <scope>` | Per-email cap |
| `enroll-start rate limit hit` | Draft-creation cap (explicit button) |
| `enroll-start rate limit hit (implicit, step save)` | Draft-creation cap via a cookieless step POST |
| `no client IP on <scope>` | Proxy is not setting `x-forwarded-for`; limiting has degraded to one shared bucket |
| `ENROLLMENT EMAIL BREAKER TRIPPED` | Daily global send cap reached. Applications still save; emails are queued |

## `timestamp forged` — the secret is the other suspect

Autofill was one cause of the generic failure message. A **`FORM_HMAC_SECRET` mismatch is the
other**, and it presents identically to a family.

`lib/env.ts` now `.trim()`s the secret, because a value pasted into a hosting dashboard very
often arrives with a trailing newline, and a secret differing by whitespace between two
environments makes every form served by one deployment fail verification at the other.

Two consequences worth understanding before touching that secret:

1. **The trim itself would have been a breaking change.** `lib/forms/hmac.ts` therefore also
   verifies against the *untrimmed* `process.env` value, so deploying the trim did not
   invalidate forms and draft cookies that were already in flight.
2. **Rotation has a grace window.** Set `FORM_HMAC_SECRET_PREVIOUS` to the old value, deploy
   the new one, wait longer than `MAX_FORM_AGE_MS` (12h), then remove it. Without this,
   rotating the secret dumps every family mid-agreement back to the start, because the same
   secret signs the draft cookie.

Signing always uses the current secret; only verification accepts the extras. That widens
forgery surface solely to whoever already held the old secret.

## Drafts store RAW input

Step schemas transform strings to `Date`. Storing `parsed.data` therefore put `Date` objects
in the draft, and the final whole-agreement re-validation failed with *"expected string,
received Date"* — after the family had filled in everything. **Drafts hold what the family
typed; applications hold validated output.**

## Submit RETAINS a stripped draft — it does not delete it

`submitEnrollmentAction` calls `retainDraftForSibling()`, not `discardDraft()`.

The original code deleted the draft and cleared the cookie on submit. That destroyed the
only source of the guardian's contact details, so the "enroll another child" flow seeded an
empty object and pre-fill silently never worked. It looked implemented and had never
functioned once.

What retention does instead:

1. **Strips** the draft to only the sibling carry-over fields. The child's medical history,
   name, date of birth, acknowledgments, media-release choice and signature are removed —
   the application is the system of record for those, and keeping a second copy is retention
   with no purpose.
2. **Marks** it `submittedAt`, so `loadActiveDraft()` returns null, the step pages refuse to
   resume it, and `saveDraftStep()` refuses to write to it.
3. **Keeps** the cookie for **two hours only**, so the sibling flow can find it.

Use `loadDraft()` only where a submitted draft is legitimately wanted (the sibling seed).
Everything that resumes or writes the wizard uses `loadActiveDraft()`.

### Retention, in three tiers

| State | Lifetime | Mechanism |
|---|---|---|
| Abandoned in-progress draft | 14 days | TTL on `updatedAt` |
| Submitted carry-over stub, unused | 24 hours | TTL on `submittedAt` |
| Submitted carry-over stub, consumed | deleted immediately | `startEnrollmentAction` |

The two-hour cookie and the matching `SIBLING_SEED_MAX_AGE_MS` freshness check are a privacy
fix, not housekeeping. Keeping the cookie past a submit means that on a shared family,
library, or school-office computer the **next** visitor clicking "Start an agreement for
another child" would see the previous family's address, phone, emergency contact and doctor
pre-filled. Sibling enrollment happens in one sitting, so bounding it to one costs nobody
anything.

### What must never carry over to a sibling

Verified by regression test: the first child's **medical history**, **name**, **media-release
choice** and **funding election** must not appear in the sibling's agreement, and the
signature must be given afresh. Each agreement is independently signed.

`esaElection` was carried over and no longer is. The Iowa ESA is a **per-student** account, so
the funding election is a per-student decision. Pre-selected, a family who elected ESA for
their first child and intended to pay directly for their second could click past a
pre-filled radio and end up with a *signed* agreement recording a financial election they
never made.

**`siblingSeed()` is a user-facing promise.** The confirmation page states exactly what
carries over and which step it appears on. Change the list, change that copy, in the same
commit.

## Tell the family what was pre-filled

The sibling flow lands on the **student** step, which contains none of the carried-over
fields. A family clicking "enroll another child" therefore saw an apparently blank form and
concluded the carry-over was broken — which is how Bug 2 was reported, even in a build where
the seed had reached the draft correctly.

Two fixes, both needed:

- The confirmation page names the steps the values appear on.
- The draft records `seededFields` at creation, and the guardian/medical steps render a
  "carried over from your last agreement — please check it is still correct" notice until the
  family saves that step. A silently pre-filled value on a document someone is about to sign
  should be confirmed, not assumed.

`seededFields` is recorded rather than inferred from `Object.keys(data)`, which stops being a
reliable signal the moment the family saves anything.
