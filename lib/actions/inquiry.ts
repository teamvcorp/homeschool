"use server";

import {
  homeschoolInterestSchema,
  type HomeschoolInterest,
} from "../validation/inquiry";
import { inquiriesCollection } from "../db/collections";
import { INQUIRY_TYPE_LABELS } from "../db/enums";
import type { InquiryDoc } from "../db/types";
import { checkFormFingerprint, consumeFormRateLimit } from "../anti-abuse";
import { RATE_LIMITS } from "../auth/rate-limit";
import { getClientIp } from "../audit";
import { sendEmail } from "../email/send";
import { inquiryNotificationEmail } from "../email/templates";
import { homeschoolAtHome } from "../site";
import { env } from "../env";
import { type ActionState, guardAction, success, failure, fromZodError } from "./types";

/**
 * HOMESCHOOL AT HOME — INTEREST ACTION
 * =============================================================================
 * The first code in this repo that actually writes an `inquiries` row. The collection,
 * its index, the document type, the notification template, and the /api/email/retry
 * handler all already existed; only the producer was missing, because /contact is a set
 * of mailto: links.
 *
 * Ordering mirrors the enrollment path (see lib/actions/enrollment.ts), and for the same
 * reasons:
 *
 *   free checks → schema validation → rate limit → persist → notify
 *
 * ⚠️  WHAT THIS ACTION IS NOT PERMITTED TO DO
 * Write to `students`, `users`, or `enrollmentApplications`. A Homeschool at Home family
 * is NOT enrolling: they remain independent homeschoolers under Iowa CPI, and the school
 * is not their school of record. The single row this produces is a sales lead, and a
 * human picks it up from there — billing is manual and offline, exactly like the $200
 * tier. There is no payment code in this repo.
 */

const SCOPE = "homeschool-interest";

/**
 * Fields arriving as checkboxes, needing "true" → true coercion.
 *
 * Listed explicitly rather than inferred from the schema, for the same reason
 * BOOLEAN_FIELDS is in lib/actions/enrollment.ts: introspecting zod internals to guess
 * which fields are boolean is fragile across versions, and being wrong here would turn a
 * required confirmation into a passing string.
 */
const BOOLEAN_FIELDS = new Set<string>(["understandsIndependentStatus"]);

/**
 * Pulls only the keys the schema declares out of the FormData.
 *
 * Whitelisting by schema shape means a crafted POST carrying extra fields cannot smuggle
 * them into the document. It also drops React's `$ACTION_*` bookkeeping fields, which is
 * why `Object.fromEntries(formData)` is never used here.
 */
function extractFields(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(homeschoolInterestSchema.shape)) {
    const value = formData.get(key);
    if (value === null) continue; // absent — let zod report it as required
    if (typeof value !== "string") continue; // a File where text belongs
    out[key] = BOOLEAN_FIELDS.has(key) ? value === "true" : value;
  }
  return out;
}

/** The situation values, rendered for a human reading the notification email. */
const SITUATION_LABELS: Record<HomeschoolInterest["currentSituation"], string> = {
  homeschoolingNow: "Homeschooling now",
  consideringHomeschool: "Considering homeschooling",
  leavingAnotherSchool: "Leaving another school",
  other: "Other",
};

const TAEKWONDO_LABELS: Record<HomeschoolInterest["taekwondoInterest"], string> = {
  yes: "Yes — wants Taekwondo",
  maybe: "Maybe — wants to hear more",
  no: "No",
};

export async function submitHomeschoolInterestAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardAction("submitHomeschoolInterest", async () => {
    /**
     * 1. FREE CHECKS — honeypot and signed timestamp. No database access.
     *
     * ⚠️  `enforceMinFillTime` IS DELIBERATELY LEFT OFF, and this is a considered choice
     * rather than an oversight.
     *
     * This form opens with name, email and phone — the exact autofill-prone shape that
     * broke the guardian step in production (see docs/forms-and-validation.md). A family
     * can accept an autofill dropdown, pick "2 children", type "K and 3rd" and submit in
     * well under two seconds. Unlike the enrollment SUBMIT, nothing gates this action:
     * there is no review page to read and no full legal name to type, so a fast submit
     * here is normal rather than suspicious.
     *
     * And be honest about what the floor would buy: the timestamp token is not
     * single-use and is replayable for its whole 12-hour validity, so it delays an
     * attacker once per token, not once per request. Trading a class of false rejection
     * for that is the wrong side of this module's governing principle — a false
     * rejection costs more than a tolerated bot, and the tolerated bot here costs one
     * row and one internal email.
     */
    const fingerprint = checkFormFingerprint(formData, SCOPE);
    if (!fingerprint.ok) {
      return failure(fingerprint.message ?? "We could not process that submission.");
    }

    /**
     * 2. VALIDATE BEFORE CHARGING ANY BUDGET.
     *
     * ⚠️  DO NOT COLLAPSE STEPS 1 AND 3 INTO checkPublicFormAbuse(). Its docblock offers
     * itself for exactly this shape of form, and it was considered and rejected twice
     * over:
     *   - the per-email key must hash the NORMALISED address, which only exists after
     *     the schema lowercases it. Charging first would hand one family two buckets for
     *     "Jane@" and "jane@" — the bug ENROLL_SUBMIT_PER_EMAIL's comment records;
     *   - a family who forgets the acknowledgment checkbox would spend a rate-limit slot
     *     on a mistake. See the warning on consumeFormRateLimit.
     */
    const parsed = homeschoolInterestSchema.safeParse(extractFields(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const data = parsed.data;

    // 3. Budget. Two keys doing two different jobs, so two explicit policies.
    const budget = await consumeFormRateLimit(SCOPE, {
      ipPolicy: RATE_LIMITS.INQUIRY_PER_IP,
      identifier: data.email,
      identifierPolicy: RATE_LIMITS.INQUIRY_PER_EMAIL,
    });
    if (!budget.ok) {
      return failure(budget.message ?? "We could not process that submission.");
    }

    /**
     * `InquiryDoc.message` is a required string, so synthesize one when the family left
     * the box empty.
     *
     * Never store "" — an empty message renders as a blank gold-railed box in the
     * notification email, which reads as a broken template rather than as "they did not
     * write anything".
     */
    const message =
      data.message ??
      `Interested in Homeschool at Home for ${data.childCount} child(ren), grades ${data.gradeLevels}.`;

    /**
     * 4. PERSIST. The ONLY write this action performs.
     *
     * `details` is InquiryDoc's "type-specific extras" field, so carrying the tier data
     * needs no schema change and no new collection.
     *
     * `monthlyEstimate` is precomputed on purpose: the whole point of this record is that
     * a human picks it up and invoices manually, and making the invoicer re-derive n × 20
     * is how the wrong number gets billed.
     */
    const now = new Date();
    const ip = await getClientIp();
    const inquiries = await inquiriesCollection();

    const doc: InquiryDoc = {
      type: "homeschoolAtHome",
      name: data.name,
      email: data.email,
      phone: data.phone,
      message,
      details: {
        childCount: String(data.childCount),
        gradeLevels: data.gradeLevels,
        nearestTown: data.nearestTown,
        taekwondoInterest: data.taekwondoInterest,
        currentSituation: data.currentSituation,
        monthlyEstimate: String(data.childCount * homeschoolAtHome.monthlyFee),
        acknowledgedIndependentStatus: "yes",
        /** This will not stay the only inquiry producer. */
        source: "/homeschool",
      },
      status: "new",
      submissionIp: ip ?? undefined,
      emailStatus: "queued",
      createdAt: now,
      updatedAt: now,
    };

    const { insertedId } = await inquiries.insertOne(doc);

    /**
     * 5. NOTIFY — after the write, and never allowed to fail the submission. The row is
     * already stored and sendEmail() returns rather than throws, queueing on failure for
     * /api/email/retry to drain.
     *
     * ⚠️  ONE EMAIL ONLY, TO A FIXED CONFIGURED ADDRESS. There is deliberately no
     * confirmation to the family's typed address, and adding one is not a small change.
     * The enrollment path's confirmation goes to an address the SUBMITTER TYPED, which
     * makes that form a relay a stranger can aim at a stranger from the school's own
     * verified domain — the risk ENROLLMENT_EMAIL_GLOBAL_PER_DAY exists to bound. Since
     * fyht4.com also carries password-reset mail, a second such relay would need its own
     * circuit breaker before it could ship. The inline success panel already tells the
     * family what happens next.
     */
    const detailBlock = [
      message,
      "",
      `Children: ${data.childCount}  ·  Grades: ${data.gradeLevels}`,
      `Town: ${data.nearestTown}`,
      `Taekwondo: ${TAEKWONDO_LABELS[data.taekwondoInterest]}`,
      `Situation: ${SITUATION_LABELS[data.currentSituation]}`,
      `Estimated monthly: $${data.childCount * homeschoolAtHome.monthlyFee}`,
    ].join("\n");

    const notification = inquiryNotificationEmail({
      /**
       * ⚠️  THE LABEL, NOT THE ENUM VALUE. This string is rendered raw into the subject
       * line and heading, so the enum value would read "New homeschoolAtHome enquiry".
       * See INQUIRY_TYPE_LABELS in lib/db/enums.ts.
       */
      type: INQUIRY_TYPE_LABELS.homeschoolAtHome,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: detailBlock,
    });

    const result = await sendEmail({
      to: env.SCHOOL_NOTIFICATION_EMAIL,
      ...notification,
      template: "inquiryNotification",
      /**
       * ⚠️  THIS DATA IS RE-RENDERED BY /api/email/retry, long after this request is
       * gone. Every field that template reads must be present here, and `type` must be
       * the LABEL, so a retried message is identical to the original.
       */
      data: {
        type: INQUIRY_TYPE_LABELS.homeschoolAtHome,
        name: data.name,
        email: data.email,
        phone: data.phone ?? "",
        message: detailBlock,
      },
      replyTo: data.email,
      relatedId: insertedId,
    });

    await inquiries.updateOne(
      { _id: insertedId },
      { $set: { emailStatus: result.ok ? "sent" : "failed", updatedAt: new Date() } },
    );

    return success(undefined, "Thank you — we have your details.");
  });
}
