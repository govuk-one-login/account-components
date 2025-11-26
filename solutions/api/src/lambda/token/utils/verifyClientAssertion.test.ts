import { verifyClientAssertion } from "./verifyClientAssertion.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as jose from "jose";
import { getClientRegistry } from "../../../../../commons/utils/getClientRegistry/index.js";
import type { ClientEntry } from "../../../../../config/schema/types.js";

vi.mock(import("jose"));
vi.mock(import("../../../../../commons/utils/getClientRegistry/index.js"));

const mockGetClientRegistry = vi.mocked(getClientRegistry);
const mockDecodeJwt = vi.mocked(jose.decodeJwt);
const mockJwtVerify = vi.mocked(jose.jwtVerify);
const mockCreateRemoteJWKSet = vi.mocked(jose.createRemoteJWKSet);

describe("verifyClientAssertion", () => {
  const mockClientAssertion = "mock.jwt.token";
  const mockClientRegistry: [ClientEntry, ...ClientEntry[]] = [
    {
      client_id: "test-client-id",
      scope: "test-scope",
      redirect_uris: ["https://example.com/callback"],
      client_name: "Test Client",
      jwks_uri: "https://example.com/.well-known/jwks.json",
    },
  ];
  const mockDecodedJwt = {
    iss: "test-client-id",
    iat: Math.floor(Date.now() / 1000) - 60,
    aud: "https://example.com/token",
  };
  const mockPayload = { sub: "test-subject", iss: "test-client-id" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientRegistry.mockResolvedValue(mockClientRegistry);
    mockDecodeJwt.mockReturnValue(mockDecodedJwt);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    mockJwtVerify.mockResolvedValue({
      payload: mockPayload,
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    mockCreateRemoteJWKSet.mockReturnValue(vi.fn() as any);
  });

  it("should successfully verify client assertion", async () => {
    const result = await verifyClientAssertion(mockClientAssertion);

    expect(result).toStrictEqual(mockPayload);
    expect(mockGetClientRegistry).toHaveBeenCalledTimes(1);
    expect(mockDecodeJwt).toHaveBeenCalledWith(mockClientAssertion);
    expect(mockCreateRemoteJWKSet).toHaveBeenCalledWith(
      new URL(mockClientRegistry[0].jwks_uri),
    );
  });

  it("should throw error when iss is missing from JWT", async () => {
    mockDecodeJwt.mockReturnValue({});

    await expect(verifyClientAssertion(mockClientAssertion)).rejects.toThrow(
      "Missing iss in client assertion",
    );
  });

  it("should throw error when client is not found in registry", async () => {
    mockDecodeJwt.mockReturnValue({
      ...mockDecodedJwt,
      iss: "unknown-client-id",
    });

    await expect(verifyClientAssertion(mockClientAssertion)).rejects.toThrow(
      "Client unknown-client-id not found for client assertion",
    );
  });

  it("should handle JWT verification failure", async () => {
    const jwtError = new Error("JWT verification failed");
    mockJwtVerify.mockRejectedValue(jwtError);

    await expect(verifyClientAssertion(mockClientAssertion)).rejects.toThrow(
      "JWT verification failed",
    );
  });
});
