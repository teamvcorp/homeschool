import "server-only";
import { env } from "../env";
import { school, tuition, dailyApp } from "../site";
import { translator, type MessageKey } from "../i18n";
import { LOCALE_HTML_LANG, type Locale } from "../i18n/locales";

/**
 * EMAIL TEMPLATES
 * =============================================================================
 * Plain functions returning `{ subject, html, text }`. No react-email, no MJML — two
 * transactional emails do not justify a rendering framework, and inline-styled tables
 * are what email clients actually render reliably anyway.
 *
 * ⚠️  NOTHING FROM A STUDENT RECORD GOES IN AN EMAIL BODY. No medical conditions, no
 * medications, no date of birth, no behavioral notes. The staff notification carries a
 * name and a link into the authenticated admin view; the detail stays behind the login.
 */

const NAVY = "#12263f";
const GOLD = "#a9760a";
const INK = "#1e2a38";
const MUTED = "#6b7c91";

/** Minimal escaping for values interpolated into HTML email. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * `locale` sets the `lang` attribute, which is not cosmetic: it drives screen-reader
 * pronunciation, and for Lao it drives LINE BREAKING, because Lao does not put spaces
 * between words. Defaults to English so the two pre-existing templates are unaffected.
 */
function layout(heading: string, bodyHtml: string, locale: Locale = "en"): string {
  return `<!doctype html>
<html lang="${LOCALE_HTML_LANG[locale]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:${NAVY};padding:24px 28px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${esc(school.dbaName)}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#f2c14e;">${esc(school.tagline)}</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${NAVY};">${esc(heading)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 28px;background:#f7f9fc;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">
            ${esc(school.legalName)}<br>
            ${esc(school.address.street)}, ${esc(school.address.city)}, ${esc(school.address.state)} ${esc(school.address.zip)}<br>
            ${esc(school.phone)} &middot; ${esc(school.email)}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const p = (text: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${INK};">${text}</p>`;

/* ------------------------- Family confirmation ---------------------------- */

/**
 * Sent to the parent after a successful submission.
 *
 * Contains the student's name (the family already knows it, and a confirmation
 * without it is confusing for a family enrolling siblings) and nothing else from the
 * record — no date of birth, no medical detail.
 */
export function enrollmentConfirmationEmail(input: {
  guardianName: string;
  studentName: string;
  locale?: Locale;
}): { subject: string; html: string; text: string } {
  const locale = input.locale ?? "en";
  const tr = translator(locale);
  const vars = {
    guardianName: input.guardianName,
    studentName: input.studentName,
    monthlyContribution: tuition.monthlyContribution,
  };

  /**
   * The four admissions steps come from the CATALOGUE, not from `admissionsSteps` in
   * lib/site.ts, because that array is the English marketing copy and a translated email
   * needs translated steps. The English keys mirror it and must stay in sync.
   */
  const steps = [1, 2, 3, 4].map((n) => ({
    title: tr(`email.confirmation.step${n}.title` as MessageKey),
    detail: tr(`email.confirmation.step${n}.detail` as MessageKey),
  }));

  const stepsHtml = steps
    .map(
      (step) =>
        `<li style="margin:0 0 10px;font-size:15px;line-height:1.6;color:${INK};"><strong style="color:${NAVY};">${esc(step.title)}</strong><br><span style="color:${MUTED};">${esc(step.detail)}</span></li>`,
    )
    .join("");

  const html = layout(
    tr("email.confirmation.heading", vars),
    [
      p(esc(tr("email.confirmation.thanks", vars))),
      p(esc(tr("email.confirmation.body1"))),
      eyebrow(tr("email.confirmation.nextHeading")),
      `<ol style="margin:0 0 18px;padding-left:20px;">${stepsHtml}</ol>`,
      p(esc(tr("email.confirmation.body2", vars))),
      questionsParagraph(tr),
    ].join(""),
    locale,
  );

  const text = [
    tr("email.confirmation.heading", vars),
    ``,
    tr("email.confirmation.thanks", vars),
    ``,
    tr("email.confirmation.body1"),
    ``,
    tr("email.confirmation.nextHeading").toUpperCase(),
    ...steps.map((s, i) => `${i + 1}. ${s.title} — ${s.detail}`),
    ``,
    tr("email.confirmation.body2", vars),
    ``,
    tr("email.questions.calls", { phone: school.phone }),
    ``,
    school.legalName,
    `${school.address.street}, ${school.address.city}, ${school.address.state} ${school.address.zip}`,
  ].join("\n");

  return {
    subject: tr("email.confirmation.subject", vars),
    html,
    text,
  };
}

/* --------------------------- Staff notification --------------------------- */

/**
 * Sent to the school when an application arrives.
 *
 * Carries only the student name, the guardian's contact details, and a link into the
 * authenticated admin view. Everything sensitive — medical history, the ESA election,
 * the full record — stays behind the login, deliberately.
 */
export function newApplicationNotificationEmail(input: {
  studentName: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  applicationId: string;
}): { subject: string; html: string; text: string } {
  const link = `${env.NEXT_PUBLIC_SITE_URL}/admin/applications/${input.applicationId}`;

  const html = layout(
    `New enrollment application`,
    [
      p(
        `<strong style="color:${NAVY};">${esc(input.studentName)}</strong> — submitted by ${esc(input.guardianName)}.`,
      ),
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;font-size:15px;color:${INK};">
        <tr><td style="padding:4px 12px 4px 0;color:${MUTED};">Email</td><td style="padding:4px 0;"><a href="mailto:${esc(input.guardianEmail)}" style="color:${NAVY};">${esc(input.guardianEmail)}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:${MUTED};">Phone</td><td style="padding:4px 0;">${esc(input.guardianPhone)}</td></tr>
      </table>`,
      `<p style="margin:0 0 18px;"><a href="${esc(link)}" style="display:inline-block;background:${NAVY};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;font-weight:600;">Review the application</a></p>`,
      `<p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">The full record — including medical information and the ESA election — is available in the admin area and is deliberately not included in this email.</p>`,
    ].join(""),
  );

  const text = [
    `New enrollment application`,
    ``,
    `Student:  ${input.studentName}`,
    `Guardian: ${input.guardianName}`,
    `Email:    ${input.guardianEmail}`,
    `Phone:    ${input.guardianPhone}`,
    ``,
    `Review it here: ${link}`,
    ``,
    `The full record — including medical information and the ESA election — is available in the admin area and is deliberately not included in this email.`,
  ].join("\n");

  return {
    subject: `New enrollment application — ${input.studentName}`,
    html,
    text,
  };
}

/* ----------------------------- Inquiry alert ------------------------------ */

export function inquiryNotificationEmail(input: {
  type: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
}): { subject: string; html: string; text: string } {
  const html = layout(
    `New ${esc(input.type)} enquiry`,
    [
      p(`<strong style="color:${NAVY};">${esc(input.name)}</strong>`),
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;font-size:15px;color:${INK};">
        <tr><td style="padding:4px 12px 4px 0;color:${MUTED};">Email</td><td style="padding:4px 0;"><a href="mailto:${esc(input.email)}" style="color:${NAVY};">${esc(input.email)}</a></td></tr>
        ${input.phone ? `<tr><td style="padding:4px 12px 4px 0;color:${MUTED};">Phone</td><td style="padding:4px 0;">${esc(input.phone)}</td></tr>` : ""}
      </table>`,
      `<p style="margin:0 0 6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${GOLD};">Message</p>`,
      `<div style="padding:14px 16px;background:#f7f9fc;border-left:3px solid ${GOLD};font-size:15px;line-height:1.6;color:${INK};white-space:pre-wrap;">${esc(input.message)}</div>`,
    ].join(""),
  );

  const text = [
    `New ${input.type} enquiry`,
    ``,
    `Name:  ${input.name}`,
    `Email: ${input.email}`,
    ...(input.phone ? [`Phone: ${input.phone}`] : []),
    ``,
    `Message:`,
    input.message,
  ].join("\n");

  return {
    subject: `New ${input.type} enquiry — ${input.name}`,
    html,
    text,
  };
}

/* ========================================================================== */
/*  FAMILY STATUS NOTIFICATIONS                                               */
/* ========================================================================== */

/**
 * The three messages that tell a family their application moved.
 *
 * Before these existed, a family received exactly one email — the submission
 * confirmation — and then heard nothing until someone phoned. The confirmation promises
 * that "the Head of School will be in touch", so the silence was a promise the software
 * left to a human to keep.
 *
 * WHAT IS DELIBERATELY ABSENT FROM ALL THREE
 *
 *  - Any record content. No date of birth, no medical detail, no assessment result, no
 *    review notes. The rule in lib/email/send.ts applies here in full.
 *  - Any authenticated link. Families have no login on this site — it is enrollment-only
 *    (see the division of intent on `dailyApp` in lib/site.ts) — so there is nowhere to
 *    send them. The welcome email links app.vaschool.org, which is the OTHER application.
 *  - A decline message. There is no template for `declined` on purpose: that conversation
 *    happens by phone, and the admin screen prompts staff to make the call.
 *
 * Each takes a `locale` and renders through the message catalogue, because a family that
 * applied in Spanish should not be told they were accepted in English.
 */

const emailButton = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;">
    <tr><td style="background:${NAVY};border-radius:8px;">
      <a href="${esc(href)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${esc(label)}</a>
    </td></tr>
  </table>`;

const eyebrow = (text: string) =>
  `<p style="margin:22px 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${GOLD};">${esc(text)}</p>`;

/**
 * The closing "questions?" line, with the phone number as a tel: link.
 *
 * Escaping happens BEFORE the anchor is substituted, so the translated sentence is
 * escaped as text while the markup is inserted afterwards. A sentinel is used rather than
 * matching the phone number itself: matching a value that also appears elsewhere in the
 * sentence would replace the wrong occurrence, and matching post-escape text is exactly
 * the kind of thing that breaks silently in one language only.
 */
function questionsParagraph(tr: (key: MessageKey, vars?: Record<string, string | number>) => string): string {
  const SENTINEL = "{{PHONE}}";
  const sentence = tr("email.questions.calls", { phone: SENTINEL });
  const anchor = `<a href="tel:${esc(school.phone.replace(/\D/g, ""))}" style="color:${NAVY};">${esc(school.phone)}</a>`;
  return p(esc(sentence).replace(SENTINEL, anchor));
}

/** Sent when an application reaches `intakeScheduled`. */
export function intakeScheduledEmail(input: {
  guardianName: string;
  studentName: string;
  locale?: Locale;
}): { subject: string; html: string; text: string } {
  const locale = input.locale ?? "en";
  const tr = translator(locale);
  const vars = { guardianName: input.guardianName, studentName: input.studentName };

  const bring = [
    tr("email.intake.bring1"),
    tr("email.intake.bring2"),
    tr("email.intake.bring3"),
  ];

  const html = layout(
    tr("email.intake.heading"),
    [
      p(esc(tr("email.intake.body1", vars))),
      p(esc(tr("email.intake.body2"))),
      eyebrow(tr("email.intake.bringHeading")),
      `<ul style="margin:0 0 18px;padding-left:20px;">${bring
        .map(
          (item) =>
            `<li style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${INK};">${esc(item)}</li>`,
        )
        .join("")}</ul>`,
      questionsParagraph(tr),
    ].join(""),
    locale,
  );

  const text = [
    tr("email.intake.heading"),
    ``,
    tr("email.intake.body1", vars),
    ``,
    tr("email.intake.body2"),
    ``,
    tr("email.intake.bringHeading").toUpperCase(),
    ...bring.map((item) => `- ${item}`),
    ``,
    tr("email.questions.calls", { phone: school.phone }),
    ``,
    school.legalName,
    `${school.address.street}, ${school.address.city}, ${school.address.state} ${school.address.zip}`,
  ].join("\n");

  return { subject: tr("email.intake.subject", vars), html, text };
}

/** Sent when an application reaches `accepted`. */
export function applicationAcceptedEmail(input: {
  guardianName: string;
  studentName: string;
  locale?: Locale;
}): { subject: string; html: string; text: string } {
  const locale = input.locale ?? "en";
  const tr = translator(locale);
  const vars = {
    guardianName: input.guardianName,
    studentName: input.studentName,
    schoolName: school.dbaName,
    monthlyContribution: tuition.monthlyContribution,
  };

  const html = layout(
    tr("email.accepted.heading", vars),
    [
      p(esc(tr("email.accepted.body1", vars))),
      p(esc(tr("email.accepted.body2", vars))),
      p(esc(tr("email.accepted.body3"))),
      questionsParagraph(tr),
    ].join(""),
    locale,
  );

  const text = [
    tr("email.accepted.heading", vars),
    ``,
    tr("email.accepted.body1", vars),
    ``,
    tr("email.accepted.body2", vars),
    ``,
    tr("email.accepted.body3"),
    ``,
    tr("email.questions.calls", { phone: school.phone }),
    ``,
    school.legalName,
  ].join("\n");

  return { subject: tr("email.accepted.subject", vars), html, text };
}

/**
 * Sent when the Office 365 mailbox is ACTIVATED — not at promotion.
 *
 * This is the only message that carries account details, and the reason it waits is
 * simple: at promotion the address exists in our records but the mailbox does not, so
 * naming it then hands a family something that bounces.
 */
export function enrollmentWelcomeEmail(input: {
  guardianName: string;
  studentName: string;
  schoolEmail: string;
  locale?: Locale;
}): { subject: string; html: string; text: string } {
  const locale = input.locale ?? "en";
  const tr = translator(locale);
  const vars = {
    guardianName: input.guardianName,
    studentName: input.studentName,
    schoolName: school.dbaName,
  };

  const html = layout(
    tr("email.welcome.heading", vars),
    [
      p(esc(tr("email.welcome.body1", vars))),
      eyebrow(tr("email.welcome.accountHeading")),
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 10px;font-size:15px;color:${INK};">
        <tr>
          <td style="padding:4px 12px 4px 0;color:${MUTED};">${esc(tr("email.welcome.accountEmail"))}</td>
          <td style="padding:4px 0;"><strong style="color:${NAVY};">${esc(input.schoolEmail)}</strong></td>
        </tr>
      </table>`,
      `<p style="margin:0 0 18px;font-size:13px;line-height:1.6;color:${MUTED};">${esc(tr("email.welcome.accountNote"))}</p>`,
      eyebrow(tr("email.welcome.appHeading")),
      p(esc(tr("email.welcome.appBody"))),
      emailButton(dailyApp.loginUrl, tr("email.welcome.appButton")),
      p(esc(tr("email.welcome.body2"))),
      questionsParagraph(tr),
    ].join(""),
    locale,
  );

  const text = [
    tr("email.welcome.heading", vars),
    ``,
    tr("email.welcome.body1", vars),
    ``,
    `${tr("email.welcome.accountEmail")}: ${input.schoolEmail}`,
    tr("email.welcome.accountNote"),
    ``,
    tr("email.welcome.appHeading").toUpperCase(),
    tr("email.welcome.appBody"),
    dailyApp.loginUrl,
    ``,
    tr("email.welcome.body2"),
    ``,
    tr("email.questions.calls", { phone: school.phone }),
    ``,
    school.legalName,
  ].join("\n");

  return { subject: tr("email.welcome.subject", vars), html, text };
}

/* ========================================================================== */
/*  ACCOUNT ACCESS                                                            */
/* ========================================================================== */

/**
 * The password-reset link.
 *
 * UNLIKE EVERY OTHER TEMPLATE HERE, this one is not about a student and does not go only
 * to a family — an administrator locked out of the records system gets exactly this
 * message. So it names no student, and it takes no student data at all.
 *
 * WHAT IT MUST NOT CONTAIN, and why each matters:
 *
 *  - A PASSWORD. Not a generated one, not a temporary one. A password in an inbox is a
 *    password in every backup of that inbox, forever. The whole point of the token flow is
 *    that the only person who ever knows the new password is the person who types it.
 *  - THE ACCOUNT HOLDER'S NAME. Tempting, and wrong: reset mail sometimes reaches a
 *    mistyped address, and a name would tell that stranger whose account it is. The
 *    address it arrived at is identity enough for the person who asked.
 *
 * The raw URL is repeated as text beneath the button on purpose. Buttons are a table and
 * an anchor, and some mail clients — and most plain-text readers — will not render them
 * usefully. A reset link that cannot be clicked must still be a reset link.
 */
export function passwordResetEmail(input: {
  resetUrl: string;
  locale?: Locale;
}): { subject: string; html: string; text: string } {
  const locale = input.locale ?? "en";
  const tr = translator(locale);
  const vars = { schoolName: school.dbaName };

  const html = layout(
    tr("email.reset.heading"),
    [
      p(esc(tr("email.reset.body1"))),
      emailButton(input.resetUrl, tr("email.reset.button")),
      p(esc(tr("email.reset.expiry"))),
      p(esc(tr("email.reset.ignore"))),
      `<p style="margin:18px 0 6px;font-size:13px;line-height:1.6;color:${MUTED};">${esc(tr("email.reset.fallback"))}</p>`,
      /**
       * `word-break` because a 43-character base64url token in a narrow mobile column
       * otherwise forces horizontal scroll or gets visually truncated — and a truncated
       * link that LOOKS complete is worse than an obviously broken one.
       */
      `<p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:${MUTED};word-break:break-all;">${esc(input.resetUrl)}</p>`,
      questionsParagraph(tr),
    ].join(""),
    locale,
  );

  const text = [
    tr("email.reset.heading"),
    ``,
    tr("email.reset.body1"),
    ``,
    input.resetUrl,
    ``,
    tr("email.reset.expiry"),
    ``,
    tr("email.reset.ignore"),
    ``,
    tr("email.questions.calls", { phone: school.phone }),
    ``,
    school.legalName,
  ].join("\n");

  return { subject: tr("email.reset.subject", vars), html, text };
}
