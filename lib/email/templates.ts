import "server-only";
import { env } from "../env";
import { school, admissionsSteps, tuition } from "../site";

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

function layout(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
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
}): { subject: string; html: string; text: string } {
  const steps = admissionsSteps
    .map(
      (step) =>
        `<li style="margin:0 0 10px;font-size:15px;line-height:1.6;color:${INK};"><strong style="color:${NAVY};">${esc(step.title)}</strong><br><span style="color:${MUTED};">${esc(step.detail)}</span></li>`,
    )
    .join("");

  const html = layout(
    `We have your application for ${esc(input.studentName)}`,
    [
      p(`Thank you, ${esc(input.guardianName)}.`),
      p(
        `Your signed Family Enrollment Agreement has been received. A copy is on file, and the Head of School will be in touch to arrange your intake meeting.`,
      ),
      `<p style="margin:22px 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${GOLD};">What happens next</p>`,
      `<ol style="margin:0 0 18px;padding-left:20px;">${steps}</ol>`,
      p(
        `Enrollment is confirmed once we have met and the first monthly contribution of $${tuition.monthlyContribution} is received. If you indicated Iowa ESA funding, remember that the application is made directly through the Iowa Department of Education — tell us what documentation you need and we will provide it.`,
      ),
      p(
        `Questions before then? Call <a href="tel:${esc(school.phone.replace(/\D/g, ""))}" style="color:${NAVY};">${esc(school.phone)}</a> or reply to this email.`,
      ),
    ].join(""),
  );

  const text = [
    `We have your application for ${input.studentName}`,
    ``,
    `Thank you, ${input.guardianName}.`,
    ``,
    `Your signed Family Enrollment Agreement has been received. A copy is on file, and the Head of School will be in touch to arrange your intake meeting.`,
    ``,
    `WHAT HAPPENS NEXT`,
    ...admissionsSteps.map((s, i) => `${i + 1}. ${s.title} — ${s.detail}`),
    ``,
    `Enrollment is confirmed once we have met and the first monthly contribution of $${tuition.monthlyContribution} is received.`,
    ``,
    `Questions? Call ${school.phone} or reply to this email.`,
    ``,
    `${school.legalName}`,
    `${school.address.street}, ${school.address.city}, ${school.address.state} ${school.address.zip}`,
  ].join("\n");

  return {
    subject: `Enrollment application received — ${input.studentName}`,
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
