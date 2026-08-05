/**
 * ENGLISH — THE SOURCE OF TRUTH
 * =============================================================================
 * Every other catalogue is typed against this one:
 *
 *     satisfies Record<keyof typeof en, string>
 *
 * so a key added here and forgotten in es.ts or lo.ts is a COMPILE ERROR, not a page
 * that silently renders a raw key at a family. That check is the entire maintenance
 * strategy for this feature — without it the catalogues drift apart within a month and
 * nobody notices until a parent sees `email.accepted.body1` in their inbox.
 *
 * CONVENTIONS
 *
 *  - Flat, dot-namespaced keys. Nesting reads nicely and types badly.
 *  - `{placeholder}` interpolation, substituted by `t()` in ../index.ts.
 *  - Keys describe the ROLE of the string, never its content: `email.accepted.subject`,
 *    not `email.goodNews`. Re-wording then never means renaming a key.
 *  - Anything with a number a family relies on (the monthly contribution) is
 *    interpolated from lib/site.ts rather than typed in, so it cannot drift from the
 *    figure the rest of the site quotes.
 */

export const en = {
  /* ------------------------ submission confirmation ------------------------ */

  /**
   * The first email a family receives, and the reason the rest of this catalogue exists.
   *
   * It was originally English-only. Leaving it that way while translating the follow-ups
   * would have produced the least coherent possible result: apply in Spanish, receive an
   * English confirmation, then Spanish updates. A test caught it.
   *
   * The four admissions steps are duplicated here rather than read from
   * `admissionsSteps` in lib/site.ts, because that array is the English marketing copy and
   * a translated email needs translated steps. The English values below must stay in sync
   * with it — a comment on `admissionsSteps` points back here.
   */
  "email.confirmation.subject": "Enrollment application received — {studentName}",
  "email.confirmation.heading": "We have your application for {studentName}",
  "email.confirmation.thanks": "Thank you, {guardianName}.",
  "email.confirmation.body1":
    "Your signed Family Enrollment Agreement has been received. A copy is on file, and the Head of School will be in touch to arrange your intake meeting.",
  "email.confirmation.nextHeading": "What happens next",
  "email.confirmation.step1.title": "Submit an enrollment application",
  "email.confirmation.step1.detail":
    "Complete the Family Enrollment Agreement online. It takes about fifteen minutes.",
  "email.confirmation.step2.title": "Intake meeting with the Head of School",
  "email.confirmation.step2.detail":
    "We discuss your student's history, your goals, and exactly what the school expects of families and students.",
  "email.confirmation.step3.title": "Initial student assessment",
  "email.confirmation.step3.detail":
    "Informal and observational. It places your student in the appropriate cohort and establishes a baseline for progress monitoring — it is not a test to pass.",
  "email.confirmation.step4.title": "Enrollment confirmed",
  "email.confirmation.step4.detail":
    "Confirmed upon receipt of the signed Enrollment Agreement and the first monthly contribution.",
  "email.confirmation.body2":
    "Enrollment is confirmed once we have met and the first monthly contribution of ${monthlyContribution} is received. If you indicated Iowa ESA funding, remember that the application is made directly through the Iowa Department of Education — tell us what documentation you need and we will provide it.",

  /* ----------------------------- status emails ----------------------------- */

  /**
   * Sent when an application moves to `intakeScheduled`.
   *
   * Note what this deliberately does NOT say: a date and time. The application record
   * holds no appointment, so promising one here would be a lie the school then has to
   * manage. It says the school is arranging it, and tells the family what to bring —
   * which is genuinely useful, because immunization documentation is handed over at
   * intake rather than uploaded (see Document 4 §4.1).
   */
  "email.intake.subject": "Next step for {studentName} — the intake meeting",
  "email.intake.heading": "We are ready to meet",
  "email.intake.body1":
    "Thank you, {guardianName}. We have reviewed your application for {studentName} and the next step is the intake meeting with the Head of School.",
  "email.intake.body2":
    "We will contact you directly to agree a time that suits you. The meeting is a conversation, not a test — it is where we get to know your student and answer your questions.",
  "email.intake.bringHeading": "Please bring",
  "email.intake.bring1":
    "Immunization records, or a valid Iowa exemption certificate.",
  "email.intake.bring2":
    "Any previous school records or assessments you would like us to see.",
  "email.intake.bring3": "Your questions. Bring all of them.",

  /** Sent when an application moves to `accepted`. */
  "email.accepted.subject": "{studentName} has been accepted",
  "email.accepted.heading": "Welcome — {studentName} has a place with us",
  "email.accepted.body1":
    "Thank you, {guardianName}. Following the intake meeting and assessment, we are pleased to offer {studentName} a place at {schoolName}.",
  "email.accepted.body2":
    "Enrollment is confirmed once the first monthly family contribution of ${monthlyContribution} is received. If you indicated Iowa ESA funding, that application is made directly through the Iowa Department of Education — tell us what documentation you need and we will provide it.",
  "email.accepted.body3":
    "We will be in touch shortly to confirm the start date and what to expect on the first day.",

  /**
   * Sent when the Office 365 mailbox is activated, NOT at promotion.
   *
   * At promotion the address exists in our records but not as a mailbox, so an email
   * naming it would hand the family something that bounces.
   */
  "email.welcome.subject": "{studentName} is enrolled — school account details",
  "email.welcome.heading": "{studentName} is officially enrolled",
  "email.welcome.body1":
    "Thank you, {guardianName}. {studentName} is now enrolled at {schoolName}, and their school account is ready.",
  "email.welcome.accountHeading": "School account",
  "email.welcome.accountEmail": "School email address",
  "email.welcome.accountNote":
    "This address is for school use — assignments, announcements, and signing in.",
  "email.welcome.appHeading": "Daily check-in",
  "email.welcome.appBody":
    "Each school day begins with check-in on the School Day app. Sign in there with the school account above.",
  "email.welcome.appButton": "Open the School Day app",
  "email.welcome.body2":
    "Everything for enrolled families — the school day and your student's progress — lives in that app. The website you applied through is only for enrollment.",

  /** Shared closing line across all three. */
  "email.questions.calls":
    "Questions? Call {phone} or simply reply to this email.",

  /* ------------------------- language toggle (UI) -------------------------- */

  "language.label": "Language",
  "language.change": "Change language",
  "language.current": "Current language: {language}",
} as const;

export type MessageKey = keyof typeof en;

export default en;
