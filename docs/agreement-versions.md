# Enrollment agreement versions (by state)

**Since 2026-11-09** enrollment is open to families in every US state. The Family
Enrollment Agreement (Document 9) was written for Iowa families training at our own
dojo, so it is now **versioned by the state the family lives in**.

| Version id | Who signs it | Status |
|---|---|---|
| `2026-08-01` | Families whose state is **IA** | Document 9 **as filed** with the Iowa DE. Frozen. SHA-256 `2308d0e0…` (unchanged from before versioning — every earlier signature still matches). |
| `2026-11-09-national` | Every other state | **Approved by the school's counsel 2026-11-09.** SHA-256 `067a373d…`. |

Source: `lib/enrollment/agreement-text.ts`. Pins: `scripts/check-agreement-hash.ts`
(`npm run check:agreement`, `-- --print` to see both texts).

## What differs in the national version

Three of the eight acknowledgments. The **keys are identical**, so storage, validation
and the "all eight must be accepted" rule did not change.

| Key | National wording adds |
|---|---|
| `taekwondoRequired` | Training is by the school **or a partner Taekwondo school it assigns for the family's area**; the family is told which before training begins. Partners are located as families enroll ("to be assigned"). |
| `monthlyContribution` | The $200/month **covers the Taekwondo program fee** at the school or the partner. |
| `activityConsent` | Consent to train **at the partner**, plus a narrow authorization to share with it only: student name, emergency contact, relevant medical/allergy info. |

Outside the signed text, the wizard also shows state-aware wording:
- **Funding** — same three stored values (`esaElection`); outside Iowa the first option is a
  *request* to use a state school-choice program "if one is available", never a promise.
- **Immunization** — "your state's law" instead of "Iowa law".

## How a version is chosen and recorded

1. Guardian step collects `guardianState` (USPS code, required — `lib/us-states.ts`).
2. `consentVersionForState(state)` → IA gets Iowa, everything else national.
3. Steps after `guardian` redirect back to it if the draft has no valid state — a version is
   **never defaulted**, because a default would silently pick which legal text is signed.
4. On submit the server re-derives the version from the **validated** state (never from a
   form field) and stores `guardianSignature.consentVersion` + `agreementHash`.
5. The Head of School's countersignature uses the **family's stored version**.
6. Executed-agreement pages (admin + portal) and the admin application view render the
   wording **by the stored version**, never "the current text".
7. `/api/translate` refuses the text of **every** version.

## Rules

- **Never edit a version families have signed.** Add a new id (e.g. `2026-12-01-national`)
  and pin it. Check first: `guardianSignature.consentVersion` in `enrollmentApplications`.
- Later edits to the national wording: if nobody has signed `2026-11-09-national` yet,
  editing it in place and re-pinning is acceptable; otherwise add a new version.
- The accreditation packet (`lib/content/accreditation.tsx`) keeps Iowa's Document 9 — it is
  the filed document, not the national one.
- Translations of the agreement are display only; the English text is the instrument.

## Open items (as of 2026-11-09)

- Taekwondo partners: listed by the school as families enroll; nothing in code yet stores
  which partner serves which area.
- Belt testing / uniform fees at a partner are not separately addressed by the "covers the
  Taekwondo program fee" sentence (wording approved as-is by counsel, 2026-11-09).
- Status emails still say "If you indicated Iowa ESA funding…" — conditional, so not false
  for other states, but could be made state-aware.
- Spanish/Lao strings for the new wizard keys are drafts (Lao unreviewed, as the file warns).
- E2E: `verify-enroll.mjs` walks a Texas agreement — green on 2026-11-09 (see `verification.md`).
