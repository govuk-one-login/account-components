import type { JWTPayload } from "jose";
import { errorManager } from "../utils/errors.js";

export interface JourneyInfoPayload extends JWTPayload {
  outcome_id?: string;
}

export function validateJourneyOutcomeJwtClaims(
  payload: JourneyInfoPayload,
): void {
  const nowInSeconds = Math.floor(Date.now() / 1000);

  const requiredClaims = [
    "outcome_id",
    "iss",
    "aud",
    "iat",
    "exp",
    "sub",
    "jti",
  ];
  for (const claim of requiredClaims) {
    if (!(claim in payload)) {
      errorManager.throwError(
        "InvalidAccessToken",
        `Missing required claim: ${claim}`,
      );
    }
  }

  if (
    typeof payload.outcome_id !== "string" ||
    payload.outcome_id.trim().length === 0
  ) {
    errorManager.throwError(
      "InvalidAccessToken",
      "outcome_id must be a non-empty string.",
    );
  }

  const expectedIssuer = "https://api.manage.account.gov.uk/token";
  if (payload.iss !== expectedIssuer) {
    errorManager.throwError(
      "InvalidAccessToken",
      `Invalid issuer. Expected "${expectedIssuer}", got "${payload.iss?.toString() ?? "undefined"}".`,
    );
  }

  const expectedAudience = "https://api.manage.account.gov.uk/journeyinfo";
  if (payload.aud !== expectedAudience) {
    errorManager.throwError(
      "InvalidAccessToken",
      `Invalid audience. Expected "${expectedAudience}", got "${payload.aud?.toString() ?? "undefined"}".`,
    );
  }

  if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
    errorManager.throwError(
      "InvalidAccessToken",
      "sub must be a non-empty string.",
    );
  }

  if (typeof payload.jti !== "string" || payload.jti.trim().length === 0) {
    errorManager.throwError(
      "InvalidAccessToken",
      "jti must be a non-empty string.",
    );
  }

  if (typeof payload.iat !== "number" || payload.iat > nowInSeconds) {
    errorManager.throwError(
      "InvalidAccessToken",
      "iat claim is in the future.",
    );
  }

  if (typeof payload.exp !== "number" || payload.exp <= nowInSeconds) {
    errorManager.throwError(
      "InvalidAccessToken",
      "exp claim is in the past (token has expired).",
    );
  }
}
