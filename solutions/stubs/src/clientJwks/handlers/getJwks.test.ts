import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockGetClientRegistry = vi.fn();
const mockCreatePublicKey = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/awsClient/ssmClient/index.js"),
  () => ({
    getParametersProvider: vi.fn(() => ({ get: mockGet })),
  }),
);

vi.mock(import("../../../../commons/utils/getClientRegistry/index.js"), () => ({
  getClientRegistry: vi.fn(),
}));

vi.mock(import("node:crypto"), () => ({
  createPublicKey: vi.fn(),
}));

import { getJwks } from "./getJwks.js";
import { getClientRegistry } from "../../../../commons/utils/getClientRegistry/index.js";
import { createPublicKey } from "node:crypto";

const mockEcPublicKey = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEExample
-----END PUBLIC KEY-----`;

const mockRsaPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAExample
-----END PUBLIC KEY-----`;

const mockEcJwk = {
  kty: "EC",
  crv: "P-256",
  x: "example-x",
  y: "example-y",
};

const mockRsaJwk = {
  kty: "RSA",
  n: "example-n",
  e: "AQAB",
};

describe("getJwks", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      params: { client: "test-client" },
      log: { warn: vi.fn() } as unknown as FastifyBaseLogger,
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    process.env["MOCK_CLIENT_EC_PUBLIC_KEY_SSM_NAME"] = "test-ec-ssm-param";
    process.env["MOCK_CLIENT_RSA_PUBLIC_KEY_SSM_NAME"] = "test-rsa-ssm-param";

    vi.mocked(getClientRegistry).mockImplementation(mockGetClientRegistry);
    vi.mocked(createPublicKey).mockImplementation(mockCreatePublicKey);
  });

  it("should return JWKS for valid client", async () => {
    const mockClientRegistryWithMatchingName = [
      {
        client_id: "test-client-id",
        client_name: "test-client",
        scope: "test-scope",
        redirect_uris: ["https://example.com"],
        jwks_uri: "https://example.com/jwks",
      },
    ];

    mockGetClientRegistry.mockResolvedValue(mockClientRegistryWithMatchingName);
    mockGet
      .mockResolvedValueOnce(mockEcPublicKey)
      .mockResolvedValueOnce(mockRsaPublicKey);
    mockCreatePublicKey
      .mockReturnValueOnce({
        export: vi.fn().mockReturnValue(mockEcJwk),
      })
      .mockReturnValueOnce({
        export: vi.fn().mockReturnValue(mockRsaJwk),
      });

    await getJwks(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.send).toHaveBeenCalledWith({
      keys: [
        {
          ...mockEcJwk,
          use: "sig",
          kid: "ecKid123",
          alg: "ES256",
        },
        {
          ...mockRsaJwk,
          use: "sig",
          kid: "rsaKid123",
          alg: "RS256",
        },
      ],
    });
  });

  it("should return 400 for invalid request params", async () => {
    mockRequest.params = {};

    await getJwks(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith(expect.any(Array));
  });

  it("should return 404 for client not found", async () => {
    mockGetClientRegistry.mockResolvedValue([]);

    await getJwks(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockRequest.log?.warn).toHaveBeenCalledWith(
      "Client 'test-client' not found",
    );
    expect(mockReply.status).toHaveBeenCalledWith(404);
    expect(mockReply.send).toHaveBeenCalledWith();
  });

  it("should throw error when SSM parameter names not set", async () => {
    const mockClientRegistryWithMatchingName = [
      {
        client_id: "test-client-id",
        client_name: "test-client",
        scope: "test-scope",
        redirect_uris: ["https://example.com"],
        jwks_uri: "https://example.com/jwks",
      },
    ];

    delete process.env["MOCK_CLIENT_EC_PUBLIC_KEY_SSM_NAME"];
    delete process.env["MOCK_CLIENT_RSA_PUBLIC_KEY_SSM_NAME"];
    mockGetClientRegistry.mockResolvedValue(mockClientRegistryWithMatchingName);

    await expect(
      getJwks(mockRequest as FastifyRequest, mockReply as FastifyReply),
    ).rejects.toThrowError(
      "Environment variable MOCK_CLIENT_EC_PUBLIC_KEY_SSM_NAME is not set",
    );
  });

  it("should throw error when public key parameters are not set", async () => {
    const mockClientRegistryWithMatchingName = [
      {
        client_id: "test-client-id",
        client_name: "test-client",
        scope: "test-scope",
        redirect_uris: ["https://example.com"],
        jwks_uri: "https://example.com/jwks",
      },
    ];

    mockGetClientRegistry.mockResolvedValue(mockClientRegistryWithMatchingName);
    mockGet.mockResolvedValue(null);

    await expect(
      getJwks(mockRequest as FastifyRequest, mockReply as FastifyReply),
    ).rejects.toThrowError("EC public key parameter is not set");
  });
});
