import "server-only";
import { createHash } from "node:crypto";
import { school } from "../site";
import { acknowledgmentList, type AgreementVersion } from "./agreement-text";

/**
 * SIGNATURE EVIDENCE
 * =============================================================================
 * The server-only half of the agreement: a canonical serialisation of everything a
 * signer was shown, and its hash. The wording lives in agreement-text.ts (versioned by
 * state since 2026-11-09); this module adds node:crypto and cannot cross to the browser.
 *
 * WHY THE HASH MATTERS
 * An electronic signature is only as good as the evidence of what was signed. If the
 * wording is later edited, a stored "I agreed" is worthless without proof of which
 * words it referred to. So the canonical text OF THE VERSION SHOWN is hashed and the
 * digest is stored on each signature record alongside its version id.
 */

/**
 * Canonical serialisation of one agreement version.
 *
 * Deliberately not the rendered HTML: markup churns for styling reasons that carry no
 * legal meaning. This captures the words and terms only.
 *
 * ⚠️  THE SHAPE OF THIS STRING IS PART OF THE EVIDENCE. For the Iowa version it must stay
 * byte-identical to the pre-versioning output, or every Iowa signature already on file
 * stops matching. scripts/check-agreement-hash.ts pins it.
 */
export function agreementText(agreement: AgreementVersion): string {
  return [
    `${school.legalName} (${school.dbaName})`,
    `Family Enrollment Agreement`,
    `Consent version: ${agreement.version}`,
    ``,
    agreement.preamble,
    ...acknowledgmentList(agreement).map((a, i) => `${i + 1}. ${a.text}`),
    ``,
    agreement.attestation,
  ].join("\n");
}

/** SHA-256 of one version's canonical text. Stored on every signature record. */
export function agreementHash(agreement: AgreementVersion): string {
  return createHash("sha256").update(agreementText(agreement), "utf8").digest("hex");
}

// Re-exported so server-side callers have one import for text and evidence.
export * from "./agreement-text";
