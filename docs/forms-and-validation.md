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
| Save a wizard step | ✓ | ✓ | ✓ | **no** | 120/hr per IP |
| **Final submit** | ✓ | ✓ | ✓ | **yes (2s)** | 6/hr per IP, 4/day per email |

**Never enable `enforceMinFillTime` on a step save.** A family accepting a browser autofill
dropdown and clicking Save can legitimately do it in under two seconds. The floor is safe on
the final submit only, because reaching it requires passing a review page and typing a full
legal name.

## Diagnosability without a bypass oracle

The visitor-facing message is intentionally identical across the adversarial failure modes,
so an attacker gets no feedback to tune against. Every branch logs a distinct string so the
school can still diagnose a problem — this is how the autofill bug was found. Search Vercel
runtime logs for `[anti-abuse]`:

| Log line | Cause |
|---|---|
| `honeypot ticked on <scope>` | Something ticked the trap |
| `timestamp too-fast on <scope>` | Under the fill-time floor (final submit only) |
| `timestamp forged on <scope>` | HMAC mismatch — check `FORM_HMAC_SECRET` for stray whitespace |
| `timestamp missing on <scope>` | The hidden field is not reaching the server |
| `timestamp malformed on <scope>` | Corrupted token |
| `enroll-start rate limit hit` | Draft-creation cap |

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
   the application is the system of record for those, and keeping a second copy for another
   14 days is retention with no purpose.
2. **Marks** it `submittedAt`, so `loadActiveDraft()` returns null and the step pages refuse
   to resume it.
3. **Keeps** the cookie, so the sibling flow can find it.

Use `loadDraft()` only where a submitted draft is legitimately wanted (the sibling seed).
Everything that resumes or writes the wizard uses `loadActiveDraft()`.

### What must never carry over to a sibling

Verified by regression test: the first child's **medical history**, **name**, and the
**media-release choice** must not appear in the sibling's agreement, and the signature must
be given afresh. Each agreement is independently signed.
