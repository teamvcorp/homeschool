# Content sources

Every public page traces to a document in `VA_School_Complete_Document_Package.pdf`
(the Iowa DE submission). When editing copy, check it against the source — a
discrepancy between the public site and the filed documents is exactly the kind of
thing a reviewer notices.

Structured facts live in **`lib/site.ts`**, not in the pages. Both the marketing pages
and the accreditation packet render from it, so they cannot disagree.

## Public pages

| Route | Source | Contains |
|---|---|---|
| `/` | Docs 1–4 | Tagline, mastery model, Whole-Part-Whole, six convictions, Three Pillars, cohorts, subjects, tuition teaser |
| `/about` | Doc 1 | Founding 2012, institutional history, graduate outcomes, Storm Lake context, facility, K12/Stride → ESA, identity table (§1.1) |
| `/mission` | Doc 2 | Mission (§2.1), vision (§2.2), six philosophy pillars (§2.3), five Taekwondo-aligned values (§2.4) |
| `/curriculum` | Doc 3 | Whole-Part-Whole (§3.1), cohorts (§3.2), subject scope (§3.3), resources (§3.4), mastery assessment (§3.5) |
| `/handbook` | Doc 4 | Admissions (§4.2), tuition (§4.3), calendar (§4.4), attendance (§4.5), Three Pillars + 5-step response (§4.6), Taekwondo (§4.7), graduation (§4.8) |
| `/staff` | Doc 5 | Head of School (§5.1), instructor requirements (§5.2), instructor log (§5.3), recruitment |
| `/higher-institute` | Doc 7 | Premise, eligibility (§7.2), two-year framework (§7.3), four pathways (§7.4), dual enrollment (§7.5), completion (§7.6) |
| `/admissions` | Doc 4 §4.2 | Who we serve, four-step process, non-discrimination, cohort placement |
| `/tuition` | Doc 4 §4.3 | $200/month, Iowa ESA explainer, hardship |
| `/contact` | Doc 4 §4.1 | Address, phone, email, ways to get in touch |
| `/enroll` | Doc 9 | Enrollment entry point (**interim** — Phase 4 replaces the body with the wizard) |
| `/accreditation` | All | Packet index |
| `/accreditation/[doc]` | Docs 1–9 + narrative | The full submission, printable |

## Accreditation packet

Content lives in `lib/content/accreditation.tsx`; slugs and titles in
`lib/site.ts` (`accreditationDocs`), which also drives `generateStaticParams`.

| Slug | Document |
|---|---|
| `school-profile` | 1 — School Profile & Institutional History |
| `mission-philosophy` | 2 — Mission, Vision & Educational Philosophy |
| `curriculum-framework` | 3 — Curriculum Framework & Scope of Instruction |
| `family-handbook` | 4 — Student & Family Handbook |
| `staff-qualifications` | 5 — Staff Qualifications & Instructor Framework |
| `student-records` | 6 — Student Records System & Templates A–D |
| `higher-institute` | 7 — The VA Higher Institute Program Framework |
| `employer-mou` | 8 — Employer Partnership Agreement (MOU) |
| `enrollment-agreement` | 9 — Family Enrollment Agreement |
| `iowa-de-narrative` | Bonus — Iowa DE Application Narrative |

Documents 6, 8, and 9 render as genuinely **blank printable forms**, because the
school uses them on paper today. The admin records system implements the same schema
digitally.

## What changed from the old site, and why

The site previously presented a brand called **"Homeschool+ — Education of the
Future"**, positioned as "a revolutionary collaboration between martial arts schools,
K-12 education, and advanced coursework." None of that language appears in the
school's own documentation.

| Old | Now | Why |
|---|---|---|
| "Homeschool+" | The VA School / Von Der Becke Academy Corp | The actual legal and operating names |
| "Education of the Future" | "We don't lower the bar. We raise the student." | The school's real tagline |
| Four Pillars: Collaboration, Leadership, Critical Thinking, Problem Solving | The six philosophy convictions from Doc 2 §2.3 | The old four were generic education buzzwords absent from the source material; the real six are specific and argumentative |
| Four Programs: Robotics, AI & Programming, Mechanics, Micro Societies | Core academic subjects first, then enrichment | The old framing advertised enrichment as the whole curriculum, understating the academic scope |
| "Transparency" section | Folded into `/about` and `/accreditation` | The strongest transparency claim is publishing the actual submission |
| `EnrollLink` → external Taekwondo membership page | `/enroll` | Enrollment is the school's own process, not a redirect to a dojo signup |

## Known placeholders

The source PDF leaves two fields as `[INSERT]`, and the site reflects that honestly
rather than inventing values:

- **Daily hours** — `/handbook` and `/contact` say these are provided on request.
- **Break schedule** — same.

**Supply these and they should be added to `lib/site.ts` and surfaced on both pages.**

## Editing rules

1. **Structured facts go in `lib/site.ts`.** Not in JSX.
2. **Check the PDF** before changing a factual claim — this is a regulatory
   submission.
3. **Statutory references** (Iowa Code §299.1, ch. 92, §261E, ch. 554D, ch. 256) are
   quoted from the source. The packet carries a standing note that they should be
   verified with qualified Iowa education counsel before filing. Do not add new ones
   casually.
4. **Bump `CONSENT_VERSION`** in `lib/db/enums.ts` if enrollment agreement wording
   changes — historical signature records identify the version the family saw.
