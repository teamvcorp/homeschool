import { tuition } from "../site";
import { ACKNOWLEDGMENT_KEYS } from "../db/enums";
import type { AcknowledgmentKey } from "../db/enums";
import { IOWA, type UsStateCode } from "../us-states";

/**
 * THE AGREEMENT WORDING — Document 9 §9.4, now VERSIONED BY STATE (2026-11-09)
 * =============================================================================
 * Deliberately NOT marked `server-only`, unlike its sibling agreement.ts.
 *
 * This is the legal text shown to a parent on the signing screen. It is not a secret;
 * it is the opposite of a secret — the whole point is that the signer reads it. The
 * signing form is a Client Component, so the wording has to be importable from the
 * client. What IS server-only lives in agreement.ts: the canonical serialisation and its
 * SHA-256 hash.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY TWO VERSIONS INSTEAD OF ONE EDITED TEXT
 *
 * Enrollment opened to every US state. The original wording assumes an Iowa family
 * training at our own dojo, and it cannot simply be edited, for two reasons:
 *
 *   1. It is Document 9 as FILED with the Iowa Department of Education (the packet on
 *      /accreditation). Iowa families must keep signing exactly that.
 *   2. Every signature stores the SHA-256 of the exact words signed plus the version id.
 *      Changing the Iowa text in place would make the old evidence point at words that
 *      no longer exist anywhere in the code.
 *
 * So:
 *   IOWA_CONSENT_VERSION      "2026-08-01"           — UNCHANGED, byte for byte. Families
 *                                                     whose state is IA sign this.
 *   NATIONAL_CONSENT_VERSION  "2026-11-09-national"  — every other state. Same eight
 *                                                     KEYS, so storage and validation are
 *                                                     unchanged; three sentences differ.
 *
 * The version is chosen from the family's STATE (guardian step) by
 * `consentVersionForState()`, stored on the signature, and every page that later shows
 * an executed agreement looks the wording up BY THAT STORED VERSION — never "the
 * current text", which would show a family words they did not sign.
 *
 * ⚠️  EDITING RULES
 *   - Never edit the text of an existing version. Add a NEW version id instead, and pin
 *     its hash in scripts/check-agreement-hash.ts.
 *   - Translations are DISPLAY ONLY. The English text here is the instrument.
 *   - The national wording below was APPROVED by the school's counsel on 2026-11-09.
 *     Any later edit ships as a new version id (e.g. "2026-12-01-national"), not as an
 *     edit to this one, once anyone has signed it — check
 *     `guardianSignature.consentVersion` in the database.
 */

export const IOWA_CONSENT_VERSION = "2026-08-01";
export const NATIONAL_CONSENT_VERSION = "2026-11-09-national";

export const CONSENT_VERSIONS = [IOWA_CONSENT_VERSION, NATIONAL_CONSENT_VERSION] as const;
export type ConsentVersion = (typeof CONSENT_VERSIONS)[number];

export interface AgreementVersion {
  version: ConsentVersion;
  /** Who signs this version — for admin screens, never part of the hashed text. */
  appliesTo: string;
  preamble: string;
  acknowledgments: Record<AcknowledgmentKey, string>;
  attestation: string;
}

/* ------------------------------ shared wording ----------------------------- */

const PREAMBLE =
  "By signing below, the parent/guardian confirms they have read The VA School Student & Family Handbook and agrees to the following:";

/**
 * The intent-to-sign affirmation. State-neutral as written: it establishes intent and
 * attribution, which is what the federal E-SIGN Act and each state's UETA turn on (Iowa:
 * Iowa Code ch. 554D) — not the visual form of a signature.
 */
const ATTESTATION =
  "I am the parent or legal guardian of the student named in this agreement. I have read and agree to every acknowledgment above. I intend my typed name below to be my legal signature, with the same effect as a handwritten signature on paper.";

/* ------------------------- IOWA — 2026-08-01 (as filed) -------------------- */

/**
 * ⚠️  FROZEN. This is Document 9 as filed. Its SHA-256 is pinned
 * (2308d0e0…) and any change — including to `tuition.monthlyContribution` — fails
 * scripts/check-agreement-hash.ts on purpose.
 */
const IOWA_ACKNOWLEDGMENTS: Record<AcknowledgmentKey, string> = {
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

/* ------------------ NATIONAL — 2026-11-09 (every other state) -------------- */

/**
 * APPROVED BY COUNSEL 2026-11-09. Identical to Iowa except three acknowledgments:
 *
 *  - taekwondoRequired   — Taekwondo may be delivered by a PARTNER school the school
 *                          assigns for the family's area ("to be assigned": partners are
 *                          located as families enroll). The family is told who before
 *                          training starts, so they never sign up to an unnamed stranger.
 *  - monthlyContribution — states that the contribution COVERS the Taekwondo program fee
 *                          (the school's decision), so a family is not surprised by a
 *                          second bill from the partner.
 *  - activityConsent     — consent to train AT THE PARTNER, plus a narrow, named
 *                          authorisation to share the minimum information that partner
 *                          needs to keep the child safe. A partner is a third party; under
 *                          FERPA-style norms sharing a child's details with it needs the
 *                          parent's consent, and the list is deliberately short.
 */
const NATIONAL_ACKNOWLEDGMENTS: Record<AcknowledgmentKey, string> = {
  ...IOWA_ACKNOWLEDGMENTS,
  taekwondoRequired:
    "We understand that Taekwondo is a core and required component of enrollment, not elective. Training is provided by the school or by a partner Taekwondo school that the school assigns for our area, and the school will tell us which school that is before training begins.",
  monthlyContribution: `We acknowledge the monthly family contribution of $${tuition.monthlyContribution} per student, which covers the Taekwondo program fee at the school or its assigned partner, and agree to timely payment.`,
  activityConsent:
    "We consent to our student's participation in all regular school activities, including Taekwondo training at the school or at its assigned partner Taekwondo school. We authorize the school to share with that partner only what it needs for our student's safe participation: our student's name, our emergency contact details, and any relevant medical or allergy information.",
};

/* --------------------------------- registry -------------------------------- */

export const AGREEMENTS: Record<ConsentVersion, AgreementVersion> = {
  [IOWA_CONSENT_VERSION]: {
    version: IOWA_CONSENT_VERSION,
    appliesTo: "Families residing in Iowa (Document 9 as filed with the Iowa DE)",
    preamble: PREAMBLE,
    acknowledgments: IOWA_ACKNOWLEDGMENTS,
    attestation: ATTESTATION,
  },
  [NATIONAL_CONSENT_VERSION]: {
    version: NATIONAL_CONSENT_VERSION,
    appliesTo: "Families residing outside Iowa",
    preamble: PREAMBLE,
    acknowledgments: NATIONAL_ACKNOWLEDGMENTS,
    attestation: ATTESTATION,
  },
};

/** Which version a family signs, from the state on their guardian step. */
export function consentVersionForState(state: UsStateCode): ConsentVersion {
  return state === IOWA ? IOWA_CONSENT_VERSION : NATIONAL_CONSENT_VERSION;
}

/**
 * The wording for a STORED version id. Returns null for an id this build does not know,
 * so a caller shows "wording not found" rather than silently substituting other text.
 */
export function getAgreement(version: string | null | undefined): AgreementVersion | null {
  return version && (CONSENT_VERSIONS as readonly string[]).includes(version)
    ? AGREEMENTS[version as ConsentVersion]
    : null;
}

/** The acknowledgments of a version, in the PDF's order, for rendering. */
export function acknowledgmentList(agreement: AgreementVersion) {
  return ACKNOWLEDGMENT_KEYS.map((key) => ({ key, text: agreement.acknowledgments[key] }));
}
