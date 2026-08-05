import "server-only";
import { createHash } from "node:crypto";
import { school } from "../site";
import { CONSENT_VERSION } from "../db/enums";
import {
  ACKNOWLEDGMENT_LIST,
  AGREEMENT_PREAMBLE,
  SIGNATURE_ATTESTATION,
} from "./agreement-text";

/**
 * SIGNATURE EVIDENCE
 * =============================================================================
 * The server-only half of the agreement: a canonical serialisation of everything a
 * signer was shown, and its hash.
 *
 * The wording itself lives in agreement-text.ts, which is client-importable because
 * the signing form must display it. This module adds node:crypto and therefore cannot
 * cross to the browser.
 *
 * WHY THE HASH MATTERS
 * An electronic signature is only as good as the evidence of what was signed. If the
 * wording is later edited, a stored "I agreed" is worthless without proof of which
 * words it referred to. So the canonical text is hashed and the digest is stored on
 * each signature record alongside CONSENT_VERSION.
 */

/**
 * Canonical serialisation of the agreement.
 *
 * Deliberately not the rendered HTML: markup churns for styling reasons that carry no
 * legal meaning, and hashing it would break the evidence chain every time a class name
 * changed. This captures the words and terms only.
 */
export function agreementText(): string {
  return [
    `${school.legalName} (${school.dbaName})`,
    `Family Enrollment Agreement`,
    `Consent version: ${CONSENT_VERSION}`,
    ``,
    AGREEMENT_PREAMBLE,
    ...ACKNOWLEDGMENT_LIST.map((a, i) => `${i + 1}. ${a.text}`),
    ``,
    SIGNATURE_ATTESTATION,
  ].join("\n");
}

/** SHA-256 of the canonical agreement text. Stored on every signature record. */
export function agreementHash(): string {
  return createHash("sha256").update(agreementText(), "utf8").digest("hex");
}

// Re-exported so server-side callers have one import for both text and evidence.
export {
  ACKNOWLEDGMENT_LIST,
  AGREEMENT_PREAMBLE,
  SIGNATURE_ATTESTATION,
} from "./agreement-text";
export { CONSENT_VERSION };
