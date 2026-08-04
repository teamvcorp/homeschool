# Data dictionary

Every collection, and which accreditation-package document specifies it. Shapes live
in `lib/db/types.ts`; enumerated values in `lib/db/enums.ts`; indexes in
`lib/db/indexes.ts`.

Source of record: `VA_School_Complete_Document_Package.pdf` (Iowa DE submission).

## Conventions

- Dates are **BSON `Date`**, never strings — string dates sort lexicographically and
  break the moment a format changes.
- **Exception:** `attendance.date` is a `"YYYY-MM-DD"` *calendar-day string*.
  Attendance is a school-day fact, not an instant; a `Date` would make it
  timezone-dependent and let one absence land on two days.
- **Soft delete only.** `archivedAt` instead of `deleteOne`. Document 6 §6.1 requires
  seven-year retention after a student departs.
- Every mutable document carries `createdAt` / `updatedAt`.
- Medical and behavioral fields are never in list projections, never emailed, never
  logged.

## Collections

| Collection | Source | Purpose |
|---|---|---|
| `users` | — | Login identities, roles, and scope (`studentIds`, `assignedStudentIds`) |
| `students` | Doc 9 → promoted | Trusted student records |
| `enrollmentApplications` | Doc 9 | **Untrusted public submissions** |
| `enrollmentDrafts` | Doc 9 | In-progress wizard state (TTL 14 days) |
| `attendance` | Doc 6 Template A | Daily attendance, Mon–Thu |
| `masteryLogs` | Doc 6 Template B | Skill mastery by subject |
| `behaviorRecords` | Doc 6 Template C | Pivotal behavior, 1–5 scale |
| `taekwondoRanks` | Doc 6 Template D | Belt progression |
| `instructors` | Doc 5 §5.3 | Instructor log + compliance |
| `partnerships` | Doc 8 | Employer MOUs |
| `inquiries` | Doc 4, Doc 5 | Tour / volunteer / partnership enquiries |
| `auditLog` | Doc 6 §6.1 | Append-only access trail |
| `rateLimits` | — | Abuse counters (TTL) |
| `emailQueue` | — | Failed-send retry |

## The critical boundary: applications ≠ students

**A public submission must never write into `students`.**

`enrollmentApplications` is the untrusted inbox. An admin reviews it and *promotes*
it into a student record. The records an Iowa DE reviewer inspects must contain only
data the Head of School vetted.

Status machine (`APPLICATION_TRANSITIONS` in `lib/db/enums.ts`, enforced
server-side):

```
submitted → intakeScheduled → assessed → accepted → enrolled
     ↓            ↓              ↓          ↓          ↓
  declined /  declined /     declined /  declined /  withdrawn
  withdrawn   withdrawn      withdrawn   withdrawn
```

`declined` and `withdrawn` are terminal.

## Correctness-critical indexes

Two indexes are correctness features, not performance ones:

- **`attendance` unique `(studentId, date)`** — makes two conflicting attendance
  marks for one student on one day impossible at the database level.
- **`enrollmentApplications` unique `idempotencyKey`** — makes a double-click or a
  retry a no-op instead of a duplicate application.

TTL indexes:

- `enrollmentDrafts.updatedAt` — 14 days. A privacy feature as much as housekeeping:
  a half-entered medical history should not sit in the database forever.
- `rateLimits.expiresAt` — `expireAfterSeconds: 0`, i.e. delete when the timestamp
  passes. This is what replaces Redis.

Also note `users.email_unique` uses `collation: { locale: "en", strength: 2 }` so
`Bob@x.com` and `bob@x.com` cannot coexist (emails are also lowercased on write).

## Enrollment agreement field map (Document 9)

| PDF section | Fields | Notes |
|---|---|---|
| §9.1 Student | `studentLegalName`, `dateOfBirth`, `gradeLevel`, `requestedCohort`, `enrollmentStartDate` | Cohort is *requested*; the school confirms at assessment |
| §9.2 Guardian | `guardian.{name,email,phone,address,emergencyContactName,emergencyContactPhone}` | |
| §9.3 Iowa ESA | `esaElection` | **Radio, not checkboxes** — the three options are mutually exclusive |
| §9.4 Acknowledgments | `acknowledgments` (8 keys) | **All eight must be `true`** to submit |
| §9.5 Medical | `medical.{conditionsAndAllergies,medications,doctorName,doctorPhone,immunizationStatus}` | Immunization is a **required either/or** — Iowa law admits no third state |
| §9.6 Media release | `mediaRelease` | Explicit **binary**, default no-consent; the guardian must actively choose |
| §9.7 Signatures | `guardianSignature`, `headOfSchoolSignature` | See below |

Acknowledgments are stored as **keys**, not sentences, so re-wording the agreement
does not orphan historical consent. `CONSENT_VERSION` records which wording the
family actually saw. **Bump `CONSENT_VERSION` whenever the legal text changes.**

## Electronic signatures

`SignatureRecord` stores: `typedName`, `intentAffirmed`, `signedAt`, `ip`,
`userAgent`, `agreementHash` (SHA-256 of the exact rendered text), `consentVersion`.

Under the federal **E-SIGN Act** and **Iowa UETA (Iowa Code ch. 554D)**, validity
turns on demonstrable **intent to sign** plus **attribution** — not on a picture of
handwriting. So intent is captured explicitly and enough context is recorded to
attribute it later, including a hash proving *what* was signed. A canvas squiggle
would add image handling and no legal weight.

## Hierarchical competency assessment

`masteryLogs.inferredFromMasteryId` implements Document 3 §3.5: mastery of a complex
task counts as evidence of its constituent skills. When a skill is credited that
way, this field records *which* complex demonstration supplied the proof — so the
record shows the inference rather than implying a separate assessment happened.

## Audit log

Append-only. Never updated, never deleted.

**Reads are audited, not just writes.** Under FERPA the question a school must answer
is not only "who changed this?" but "who has *seen* this?" The `subject_at` index
exists to answer exactly that.

**Never put in `meta`:** medical detail, behavioral notes, or any free text from a
student record. The audit log is queried and exported more freely than the records
themselves, so sensitive content there quietly widens its exposure. Keep `meta` to
identifiers and state transitions (`{ from: "submitted", to: "accepted" }`).

`logAudit()` **never throws** — an audit failure must not block the operation it
describes. That trades guaranteed completeness for availability; a provably gap-free
trail would require writing the audit entry in the same transaction as the mutation,
which is not warranted at this scale.

## Scripts

```
npm run db:ping     # connectivity + collection/index inventory (prints no secrets)
npm run db:init     # idempotent index creation
npm run seed:admin  # create the first administrator
```

`db:init` is deliberately **not** run on application boot — on serverless that would
fire a dozen index commands on every cold start.
