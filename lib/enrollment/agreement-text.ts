import { tuition } from "../site";
import { ACKNOWLEDGMENT_KEYS, CONSENT_VERSION } from "../db/enums";
import type { AcknowledgmentKey } from "../db/enums";

/**
 * THE AGREEMENT WORDING — Document 9 §9.4
 * =============================================================================
 * Deliberately NOT marked `server-only`, unlike its sibling agreement.ts.
 *
 * This is the legal text shown to a parent on the signing screen. It is not a secret;
 * it is the opposite of a secret — the whole point is that the signer reads it. The
 * signing form is a Client Component (it needs `useActionState` for error rendering),
 * so the wording has to be importable from the client.
 *
 * What IS server-only lives in agreement.ts: the canonical serialisation and its
 * SHA-256 hash, which use node:crypto and are the evidence side of the signature.
 *
 * ⚠️  WHEN YOU EDIT ANY WORDING HERE: bump CONSENT_VERSION in lib/db/enums.ts.
 * Historical signatures retain their original hash and version, so each record keeps
 * identifying exactly what that family accepted.
 */

/**
 * The eight acknowledgments, keyed.
 *
 * Keys are what get stored on an application — never these sentences — so re-wording
 * does not orphan historical consent records.
 */
export const ACKNOWLEDGMENTS: Record<AcknowledgmentKey, string> = {
  masteryProgression:
    "We understand and accept the school's mastery-based progression model — our student advances upon demonstrated mastery, not by calendar year.",
  taekwondoRequired:
    "We understand that Taekwondo is a core and required component of enrollment, not elective.",
  graduationEarned:
    "We understand that graduation from The VA School is earned through demonstrated academic and character mastery, and is not conferred by age.",
  attendanceCommitment:
    "We agree to maintain consistent attendance and to communicate promptly regarding absences.",
  behavioralFramework:
    "We understand and accept the school's behavioral framework, including the Three Pillars of Pivotal Behavior.",
  monthlyContribution: `We acknowledge the monthly family contribution of $${tuition.monthlyContribution} per student and agree to timely payment.`,
  activityConsent:
    "We consent to our student's participation in all regular school activities, including Taekwondo training.",
  recordsConfidentiality:
    "We understand that student records are maintained confidentially and may be accessed by the family upon request.",
};

/** Ordered for rendering, matching the PDF's sequence. */
export const ACKNOWLEDGMENT_LIST = ACKNOWLEDGMENT_KEYS.map((key) => ({
  key,
  text: ACKNOWLEDGMENTS[key],
}));

export const AGREEMENT_PREAMBLE =
  "By signing below, the parent/guardian confirms they have read The VA School Student & Family Handbook and agrees to the following:";

/**
 * The intent-to-sign affirmation.
 *
 * Worded to establish intent explicitly, which is what the E-SIGN Act and Iowa UETA
 * (Iowa Code ch. 554D) actually turn on — not the visual form of a signature.
 */
export const SIGNATURE_ATTESTATION =
  "I am the parent or legal guardian of the student named in this agreement. I have read and agree to every acknowledgment above. I intend my typed name below to be my legal signature, with the same effect as a handwritten signature on paper.";

export { CONSENT_VERSION };
