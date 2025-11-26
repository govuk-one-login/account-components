import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import type { JourneyInfoPayload } from "./validateJourneyOutcomeJwtClaims.js";

vi.doMock("./errors.js", () => ({
  errorManager: { throwError: vi.fn(() => undefined) },
}));

const { validateJourneyOutcomeJwtClaims } = await import(
  "./validateJourneyOutcomeJwtClaims.js"
);

const { errorManager } = await import("./errors.js");
const mockErrorManager = vi.mocked(errorManager);

describe("validateJourneyOutcomeJwtClaims", () => {
  const nowInSeconds = Math.floor(Date.now() / 1000);

  const validPayload = {
    outcome_id: "12345",
    iss: "https://api.manage.account.gov.uk/token",
    aud: "https://api.manage.account.gov.uk/journeyoutcome",
    iat: nowInSeconds - 10,
    exp: nowInSeconds + 300,
    sub: "user-subject-id",
    jti: "jwt-unique-id",
  };

  beforeAll(() => {
    process.env["JOURNEY_OUTCOME_ENDPOINT_URL"] =
      "https://api.manage.account.gov.uk/journeyoutcome";
    process.env["TOKEN_ENDPOINT_URL"] =
      "https://api.manage.account.gov.uk/token";
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(nowInSeconds * 1000);

    vi.spyOn(mockErrorManager, "throwError").mockImplementation(
      () => undefined,
    );
  });

  it("should not call errorManager.throwError for a valid payload", () => {
    validateJourneyOutcomeJwtClaims(validPayload);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).not.toHaveBeenCalled();
  });

  const requiredClaims = [
    "outcome_id",
    "iss",
    "aud",
    "iat",
    "exp",
    "sub",
    "jti",
  ];

  it.each(requiredClaims)(
    'should check calls to throwError if "%s" claim is missing',
    (missingClaim) => {
      const basePayload = { ...validPayload };

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [missingClaim]: deletedClaim, ...payloadWithMissingClaim } =
        basePayload as Record<string, unknown>;

      validateJourneyOutcomeJwtClaims(
        payloadWithMissingClaim as JourneyInfoPayload,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockErrorManager.throwError).toHaveBeenCalledWith(
        "InvalidAccessToken",
        `Missing required claim: ${missingClaim}`,
      );
    },
  );

  it("should check calls to throwError if outcome_id is invalid", () => {
    validateJourneyOutcomeJwtClaims({ ...validPayload, outcome_id: "" });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).toHaveBeenCalledWith(
      "InvalidAccessToken",
      "outcome_id must be a non-empty string.",
    );
  });

  it("should check calls to throwError if iss is invalid", () => {
    validateJourneyOutcomeJwtClaims({ ...validPayload, iss: "invalid-issuer" });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).toHaveBeenCalledWith(
      "InvalidAccessToken",
      'Invalid issuer. Expected "https://api.manage.account.gov.uk/token", got "invalid-issuer".',
    );
  });

  it("should check calls to throwError if aud is invalid", () => {
    validateJourneyOutcomeJwtClaims({
      ...validPayload,
      aud: "invalid-audience",
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).toHaveBeenCalledWith(
      "InvalidAccessToken",
      'Invalid audience. Expected "https://api.manage.account.gov.uk/journeyoutcome", got "invalid-audience".',
    );
  });

  it("should check calls to throwError if sub is invalid", () => {
    validateJourneyOutcomeJwtClaims({ ...validPayload, sub: "" });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).toHaveBeenCalledWith(
      "InvalidAccessToken",
      "sub must be a non-empty string.",
    );
  });

  it("should check calls to throwError if jti is invalid", () => {
    validateJourneyOutcomeJwtClaims({ ...validPayload, jti: "" });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).toHaveBeenCalledWith(
      "InvalidAccessToken",
      "jti must be a non-empty string.",
    );
  });

  it("should check calls to throwError if iat is in the future", () => {
    validateJourneyOutcomeJwtClaims({
      ...validPayload,
      iat: nowInSeconds + 100,
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).toHaveBeenCalledWith(
      "InvalidAccessToken",
      "iat claim is in the future.",
    );
  });
});
