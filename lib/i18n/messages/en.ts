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

  /* ---------------------------- account emails ----------------------------- */

  /**
   * The password-reset link.
   *
   * Goes to ANY role — an administrator, an instructor, or a parent — so the wording
   * names no student and assumes nothing about who is reading.
   *
   * Three things this must do, in order of how often they matter:
   *  1. Say plainly that nothing has changed yet, so a recipient who did NOT ask can
   *     close the tab and stop worrying. Most unexpected reset mail is a mistyped
   *     address, not an attack.
   *  2. State the expiry, so "the link didn't work" is self-diagnosing.
   *  3. Offer the raw URL as text. Some mail clients mangle buttons, and a link that
   *     cannot be clicked must still be usable.
   *
   * It must NEVER contain a password, and it deliberately does not name the account
   * holder — the address it was sent to is the only identity it needs, and a name would
   * confirm to a wrong recipient whose account it is.
   */
  /**
   * The em-dash form is deliberate. `{schoolName}` is "The VA School", so the natural
   * phrasing "Reset your {schoolName} password" renders as "Reset your The VA School
   * password". Naming the school still matters — it is what tells a recipient the mail
   * is not phishing — so the name goes after the sentence rather than inside it.
   */
  "email.reset.subject": "Reset your password — {schoolName}",
  "email.reset.heading": "Choose a new password",
  "email.reset.body1":
    "We received a request to reset the password for this email address. Use the button below to choose a new one.",
  "email.reset.button": "Set a new password",
  "email.reset.expiry":
    "This link stops working in one hour, and can only be used once.",
  "email.reset.ignore":
    "If you did not ask for this, you can ignore this email — nothing has changed and your current password still works.",
  "email.reset.fallback":
    "If the button does not work, copy and paste this link into your browser:",

  /* ------------------------- language toggle (UI) -------------------------- */

  "language.label": "Language",
  "language.change": "Change language",
  "language.current": "Current language: {language}",

  /* ===================== THE ENROLLMENT FUNNEL (UI copy) ==================== */
  /*
   * VISIBLE INTERFACE TEXT ONLY. Nothing here is stored, nothing here is sent to the
   * state, and nothing here is part of the enrollment agreement. Field NAMES stay in
   * English because they are the wire format the server validates against; only what a
   * family reads is translated.
   */

  "funnel.eyebrow": "Family enrollment agreement",

  /** Step names — shown in the progress indicator and as each step's heading. */
  "funnel.step.student": "Student",
  "funnel.step.guardian": "Parent / guardian",
  "funnel.step.funding": "Funding",
  "funnel.step.medical": "Medical",
  "funnel.step.acknowledgments": "Acknowledgments",
  "funnel.step.media": "Photo & media",
  "funnel.step.review": "Review",
  "funnel.step.sign": "Sign",

  "funnel.review.lead":
    "Check everything over before you sign. You can still go back and change anything.",
  "funnel.sign.lead": "One last step.",

  "funnel.carryOver.title": "Carried over from your last agreement",
  "funnel.carryOver.body":
    "We have filled these in from the agreement you just completed. Please check they are still correct for this child before continuing — you can change anything here.",

  /* --- Step 1: student --- */
  "funnel.field.studentLegalName.label": "Student's full legal name",
  "funnel.field.studentLegalName.hint":
    "As it appears on their birth certificate or legal records.",
  "funnel.field.dateOfBirth.label": "Date of birth",
  "funnel.field.gradeLevel.label": "Current or intended grade level",
  "funnel.field.gradeLevel.placeholder": "e.g. Grade 5",
  "funnel.field.gradeLevel.hint":
    "Your best estimate is fine — placement is confirmed at the intake meeting.",
  "funnel.field.requestedCohort.label": "Which cohort seems right?",
  "funnel.field.requestedCohort.hint":
    "Cohorts reflect readiness rather than age. The Head of School confirms placement.",
  "funnel.field.enrollmentStartDate.label": "Intended start date",

  /* --- Step 2: guardian --- */
  "funnel.field.guardianName.label": "Parent / guardian name(s)",
  "funnel.field.guardianAddress.label": "Home address",
  "funnel.field.guardianPhone.label": "Primary phone",
  "funnel.field.guardianEmail.label": "Email address",
  "funnel.field.guardianEmail.hint": "We send your confirmation and next steps here.",
  "funnel.field.emergencyContactName.label": "Emergency contact (if different)",
  "funnel.field.emergencyContactPhone.label": "Emergency contact phone",

  /* --- Step 3: funding --- */
  "funnel.funding.legend": "How will tuition be funded?",
  "funnel.funding.hint":
    "ESA applications are made directly through the Iowa Department of Education. We will provide any documentation your application needs.",
  "funnel.funding.esa.label": "We intend to apply for Iowa ESA funding",
  "funnel.funding.esa.description":
    "Approximately ${esaEstimate} per student per year, paid by the State of Iowa.",
  "funnel.funding.direct.label": "We will pay the monthly contribution directly",
  "funnel.funding.direct.description": "${monthlyContribution} per student per month.",
  "funnel.funding.hardship.label":
    "We are applying for financial hardship consideration",
  "funnel.funding.hardship.description":
    "The Head of School will discuss this with you privately. No student is turned away over money without a conversation first.",

  /* --- Step 4: medical --- */
  "funnel.field.conditionsAndAllergies.label": "Known medical conditions or allergies",
  "funnel.field.conditionsAndAllergies.hint":
    "Anything staff should know to keep your student safe. Leave blank if none.",
  "funnel.field.medications.label": "Current medications",
  "funnel.field.doctorName.label": "Doctor or clinic name",
  "funnel.field.doctorPhone.label": "Doctor or clinic phone",
  "funnel.immunization.legend": "Immunization documentation",
  "funnel.immunization.hint":
    "Iowa law requires documentation of either immunization compliance or a valid exemption. Bring the paperwork to your intake meeting — nothing needs uploading here.",
  "funnel.immunization.records": "Immunization records are available",
  "funnel.immunization.exemption": "A valid exemption is available",

  /* --- Step 5: acknowledgments --- */
  "funnel.acknowledgments.legend": "Program acknowledgments",
  "funnel.acknowledgments.intro":
    "All eight must be accepted. We would rather you read them and decide we are not the right school than sign and discover it in month two.",

  /* --- Step 6: media --- */
  "funnel.media.legend": "Photo and media release",
  "funnel.media.hint":
    "There is no default and no wrong answer. Declining changes nothing about your student's participation.",
  "funnel.media.consent":
    "I consent to photographs or video of my student being used for school promotional materials",
  "funnel.media.noConsent":
    "I do NOT consent to photographs or video of my student for any promotional use",

  /* ------------------------------ language lens ---------------------------- */
  /*
   * The lens's OWN copy must appear in the reader's language, not English.
   * An English instruction explaining how to read the page in Lao is useless to the one
   * person it exists for. `lens.tapHint` is the exception that proves it: it is shown
   * beside each language option BEFORE anything is selected, so a reader who cannot read
   * this sentence still sees one they can.
   */
  "lens.open": "Translate",
  "lens.title": "Read this page in",
  "lens.howTo": "Point at or tap any paragraph to see it translated.",
  "lens.tapHint": "Tap any paragraph to read it in English.",
  "lens.off": "Turn off",
  "lens.disclosure":
    "Translations are automatic and may contain mistakes. The English text is the original.",
  "lens.notice": "Automatic translation — the English above is the original.",
  "lens.unavailable": "Translation is not available right now.",

  /* --- Progress indicator --- */
  "funnel.progress.label": "Enrollment progress",
  "funnel.progress.position": "Step {current} of {total}",
  "funnel.progress.done": "completed",
  "funnel.progress.current": "current step",
  "funnel.progress.upcoming": "not started",

  /* --- Controls --- */
  "funnel.save": "Save and continue",
  "funnel.saving": "Saving…",
  "funnel.back": "Back",
  "funnel.privacyNote":
    "Your progress is saved as you go and is kept private. You can close this and come back on the same device.",
} as const;

export type MessageKey = keyof typeof en;

export default en;
