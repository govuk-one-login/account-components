import { verifyClientAssertion } from "./verifyClientAssertion.js";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as jose from "jose";
import { getClientRegistry } from "../../../../../commons/utils/getClientRegistry/index.js";
import type { ClientEntry } from "../../../../../config/schema/types.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { logger } from "../../../../../commons/utils/logger/index.js";

vi.mock(import("jose"));
vi.mock(import("../../../../../commons/utils/getClientRegistry/index.js"));
vi.mock(import("../../../../../commons/utils/metrics/index.js"));
vi.mock(import("../../../../../commons/utils/logger/index.js"));

const mockGetClientRegistry = vi.mocked(getClientRegistry);
const mockDecodeJwt = vi.mocked(jose.decodeJwt);
const mockJwtVerify = vi.mocked(jose.jwtVerify);
const mockCreateRemoteJWKSet = vi.mocked(jose.createRemoteJWKSet);
const mockDecodeProtectedHeader = vi.mocked(jose.decodeProtectedHeader);
const mockMetrics = vi.mocked(metrics);
const mockLogger = vi.mocked(logger);

const ORIGINAL_ENV = { ...process.env };

describe("verifyClientAssertion", () => {
  const mockClientAssertion = "mock.jwt.token";
  const mockApiBaseUrl = "https://example.com";
  const mockClientRegistry: [ClientEntry, ...ClientEntry[]] = [
    {
      client_id: "test-client-id",
      scope: "test-scope",
      redirect_uris: ["https://example.com/callback"],
      client_name: "Test Client",
      jwks_uri: "https://example.com/.well-known/jwks.json",
      consider_user_logged_in: false,
    },
  ];
  const mockDecodedJwt = {
    iss: "test-client-id",
    iat: Math.floor((Date.now() - 1) / 1000),
    aud: "https://example.com/token",
  };
  const mockPayload = { sub: "test-subject", iss: "test-client-id" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientRegistry.mockResolvedValue(mockClientRegistry);
    mockDecodeJwt.mockReturnValue(mockDecodedJwt);
    mockDecodeProtectedHeader.mockReturnValue({
      kid: "test-kid",
      alg: "ES256",
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    mockJwtVerify.mockResolvedValue({
      payload: mockPayload,
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    mockCreateRemoteJWKSet.mockReturnValue(vi.fn() as any);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("should successfully verify client assertion", async () => {
    const result = await verifyClientAssertion(
      mockClientAssertion,
      mockApiBaseUrl,
    );

    expect(result).toStrictEqual(mockPayload);
    expect(mockGetClientRegistry).toHaveBeenCalledTimes(1);
    expect(mockDecodeJwt).toHaveBeenCalledWith(mockClientAssertion);
    expect(mockCreateRemoteJWKSet).toHaveBeenCalledWith(
      new URL(mockClientRegistry[0].jwks_uri),
      { cacheMaxAge: 60000, timeoutDuration: 2500 },
    );
    expect(mockJwtVerify).toHaveBeenCalledWith(
      mockClientAssertion,
      expect.any(Function),
      { algorithms: ["ES256", "RS256"] },
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({
      client_id: "test-client-id",
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({
      client_id: "test-client-id",
    });
  });

  it("should verify client assertion with ES256 algorithm", async () => {
    const result = await verifyClientAssertion(
      mockClientAssertion,
      mockApiBaseUrl,
    );

    expect(result).toStrictEqual(mockPayload);
    expect(mockJwtVerify).toHaveBeenCalledWith(
      mockClientAssertion,
      expect.any(Function),
      { algorithms: ["ES256", "RS256"] },
    );
  });

  it("should verify client assertion with RS256 algorithm", async () => {
    const result = await verifyClientAssertion(
      mockClientAssertion,
      mockApiBaseUrl,
    );

    expect(result).toStrictEqual(mockPayload);
    expect(mockJwtVerify).toHaveBeenCalledWith(
      mockClientAssertion,
      expect.any(Function),
      { algorithms: ["ES256", "RS256"] },
    );
  });

  it("should throw error when iss is missing from JWT", async () => {
    mockDecodeJwt.mockReturnValue({});

    await expect(
      verifyClientAssertion(mockClientAssertion, mockApiBaseUrl),
    ).rejects.toThrowError("Missing iss in client assertion");
  });

  it("should throw error when iat is missing from JWT", async () => {
    mockDecodeJwt.mockReturnValue({
      iss: "test-client-id",
      aud: "https://example.com/token",
    });

    await expect(
      verifyClientAssertion(mockClientAssertion, mockApiBaseUrl),
    ).rejects.toThrowError(
      "Missing iat in client assertion, iss=test-client-id",
    );
  });

  it("should throw error when aud is missing from JWT", async () => {
    mockDecodeJwt.mockReturnValue({
      iss: "test-client-id",
      iat: Math.floor(Date.now() / 1000),
    });

    await expect(
      verifyClientAssertion(mockClientAssertion, mockApiBaseUrl),
    ).rejects.toThrowError(
      "Missing aud in client assertion, iss=test-client-id",
    );
  });

  it("should throw error when client is not found in registry", async () => {
    mockDecodeJwt.mockReturnValue({
      ...mockDecodedJwt,
      iss: "unknown-client-id",
    });

    await expect(
      verifyClientAssertion(mockClientAssertion, mockApiBaseUrl),
    ).rejects.toThrowError(
      "Client unknown-client-id not found for client assertion",
    );
  });

  it("should handle JWT verification failure", async () => {
    const jwtError = new Error("JWT verification failed");
    mockJwtVerify.mockRejectedValue(jwtError);

    await expect(
      verifyClientAssertion(mockClientAssertion, mockApiBaseUrl),
    ).rejects.toThrowError(
      "Failed to verify client assertion for iss=test-client-id: JWT verification failed",
    );
  });

  it("should raise an error if the iat is in the future", async () => {
    const futureIat = Math.floor(Date.now() / 1000) + 1; // 1 sec in the future
    mockDecodeJwt.mockReturnValue({
      ...mockDecodedJwt,
      iat: futureIat,
    });

    await expect(
      verifyClientAssertion(mockClientAssertion, mockApiBaseUrl),
    ).rejects.toThrowError(
      "Client assertion iat is in the future, iss=test-client-id",
    );
  });

  it("should raise an error if the aud does not include the token endpoint URL", async () => {
    mockDecodeJwt.mockReturnValue({
      ...mockDecodedJwt,
      aud: "https://invalid-audience.com",
    });

    await expect(
      verifyClientAssertion(mockClientAssertion, mockApiBaseUrl),
    ).rejects.toThrowError(
      "Invalid aud in client assertion: https://invalid-audience.com for iss=test-client-id, does not contain https://example.com/token",
    );
  });

  it("should raise an error if the JWT header is missing kid", async () => {
    mockDecodeProtectedHeader.mockReturnValue({ alg: "ES256" }); // Missing kid

    await expect(
      verifyClientAssertion(mockClientAssertion, mockApiBaseUrl),
    ).rejects.toThrowError(
      "Missing kid in client assertion header for iss=test-client-id",
    );
  });
});
