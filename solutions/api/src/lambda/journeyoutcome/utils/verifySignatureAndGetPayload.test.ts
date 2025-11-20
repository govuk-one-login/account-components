import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CryptoKey, JWTPayload, JWTHeaderParameters } from "jose";
import { Buffer } from "buffer";
import { JWSSignatureVerificationFailed, JWTInvalid } from "jose/errors";

vi.doMock("jose", () => ({
  jwtVerify: vi.fn(),
  decodeJwt: vi.fn(),
}));

vi.doMock("./errors.js", () => ({
  errorManager: { throwError: vi.fn(() => undefined) },
}));

const { verifySignatureAndGetPayload } = await import(
  "./verifySignatureAndGetPayload.js"
);

const { errorManager } = await import("./errors.js");
const { jwtVerify, decodeJwt } = await import("jose");
const { jwtSigningAlgorithm: mockSigningAlgorithm } = await import(
  "../../../../../commons/utils/constants.js"
);

const mockJwtVerify = vi.mocked(jwtVerify);
const mockDecodeJwt = vi.mocked(decodeJwt);

const mockErrorManager = vi.mocked(errorManager);

describe("verifySignatureAndGetPayload", () => {
  const mockKey = {} as CryptoKey;
  const mockPayload: JWTPayload = { sub: "123", name: "Test User" };

  const validHeaderJson: JWTHeaderParameters = {
    alg: mockSigningAlgorithm,
    typ: "JWT",
  };
  const validBase64Header = Buffer.from(
    JSON.stringify(validHeaderJson),
  ).toString("base64");

  const validPayloadJson: JWTPayload = { sub: "123", name: "Test User" };
  const validBase64Payload = Buffer.from(
    JSON.stringify(validPayloadJson),
  ).toString("base64");

  const mockToken = `${validBase64Header}.${validBase64Payload}.signature`;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(mockErrorManager, "throwError").mockImplementation(
      () => undefined,
    );
    mockDecodeJwt.mockReturnValue(mockPayload);
  });

  it("should return the payload if signature verification succeeds", async () => {
    const mockProtectedHeader: JWTHeaderParameters = {
      alg: mockSigningAlgorithm,
    };

    mockJwtVerify.mockResolvedValueOnce({
      payload: mockPayload,
      key: mockKey,
      protectedHeader: mockProtectedHeader,
    });

    const result = await verifySignatureAndGetPayload(mockToken, mockKey);

    expect(mockJwtVerify).toHaveBeenCalledWith(mockToken, mockKey, {
      algorithms: [mockSigningAlgorithm],
    });
    expect(result).toStrictEqual(mockPayload);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).not.toHaveBeenCalled();
  });

  it("should call errorManager.throwError if signature verification fails and log details", async () => {
    const expectedJti = "test-jti";
    const expectedKid = "test-kid";
    const payloadWithJti: JWTPayload = { ...mockPayload, jti: expectedJti };
    const headerJson: JWTHeaderParameters = {
      kid: expectedKid,
      alg: mockSigningAlgorithm,
    };

    mockJwtVerify.mockRejectedValueOnce(
      new JWSSignatureVerificationFailed("Invalid signature"),
    );
    mockDecodeJwt.mockReturnValue(payloadWithJti);

    const tokenHeader = Buffer.from(JSON.stringify(headerJson)).toString(
      "base64",
    );
    const tokenPayload = Buffer.from(JSON.stringify(payloadWithJti)).toString(
      "base64",
    );
    const specificToken = `${tokenHeader}.${tokenPayload}.signature`;

    await verifySignatureAndGetPayload(specificToken, mockKey);

    expect(mockJwtVerify).toHaveBeenCalledWith(specificToken, mockKey, {
      algorithms: [mockSigningAlgorithm],
    });
    expect(mockDecodeJwt).toHaveBeenCalledWith(specificToken);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).toHaveBeenCalledWith(
      "AccessTokenSignatureInvalid",
      `Invalid access token signature with jti: ${expectedJti} and kid: ${expectedKid}`,
    );
  });

  it("should handle missing jti and kid when verification fails", async () => {
    const payloadWithoutJti: JWTPayload = { ...mockPayload };
    const headerWithoutKid: JWTHeaderParameters = { alg: mockSigningAlgorithm };

    mockJwtVerify.mockRejectedValueOnce(
      new JWSSignatureVerificationFailed("Invalid signature"),
    );
    mockDecodeJwt.mockReturnValue(payloadWithoutJti);

    const tokenHeader = Buffer.from(JSON.stringify(headerWithoutKid)).toString(
      "base64",
    );
    const tokenPayload = Buffer.from(
      JSON.stringify(payloadWithoutJti),
    ).toString("base64");
    const specificToken = `${tokenHeader}.${tokenPayload}.signature`;

    await verifySignatureAndGetPayload(specificToken, mockKey);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).toHaveBeenCalledWith(
      "AccessTokenSignatureInvalid",
      "Invalid access token signature with jti: Not found and kid: Not found",
    );
  });

  it("should throw error for invalid or malformed JWT format", async () => {
    const invalidToken = "invalid.format";
    const verificationError = new JWTInvalid("JWT verification failed");

    mockJwtVerify.mockRejectedValueOnce(verificationError);

    await verifySignatureAndGetPayload(invalidToken, mockKey);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).toHaveBeenCalledWith(
      "InvalidAccessToken",
      `Access token is malformed or invalid`,
    );
  });
});
