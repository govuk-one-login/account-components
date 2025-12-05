import { errorManager } from "../utils/errors.js";
import assert from "node:assert";
import type { JourneyOutcomePayload } from "./interfaces.js";

export function validateJourneyOutcomeJwtClaims(
  payload: JourneyOutcomePayload,
): void {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const expectedIssuer = process.env["TOKEN_ENDPOINT_URL"];
  const expectedAudience = process.env["JOURNEY_OUTCOME_ENDPOINT_URL"];

  assert(expectedIssuer, "expectedIssuer not set");

  assert(expectedAudience, "expectedAudience not set");
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

  if (payload.iss !== expectedIssuer) {
    errorManager.throwError(
      "InvalidAccessToken",
      `Invalid issuer. Expected "${expectedIssuer}", got "${payload.iss?.toString() ?? "undefined"}".`,
    );
  }

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
}
