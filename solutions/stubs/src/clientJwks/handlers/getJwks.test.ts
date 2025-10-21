import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockGetClientRegistry = vi.fn();
const mockCreatePublicKey = vi.fn();

vi.mock("../../../../commons/utils/awsClient/index.js", () => ({
  getParametersProvider: vi.fn(() => ({ get: mockGet })),
}));

vi.mock(import("../../../../commons/utils/getClientRegistry/index.js"), () => ({
  getClientRegistry: vi.fn(),
}));

vi.mock(import("node:crypto"), () => ({
  createPublicKey: vi.fn(),
}));

import { getJwks } from "./getJwks.js";
import { getClientRegistry } from "../../../../commons/utils/getClientRegistry/index.js";
import { createPublicKey } from "node:crypto";

const mockPublicKey = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEExample
-----END PUBLIC KEY-----`;

const mockJwk = {
  kty: "EC",
  crv: "P-256",
  x: "example-x",
  y: "example-y",
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

    process.env["MOCK_CLIENT_EC_PUBLIC_KEY_SSM_NAME"] = "test-ssm-param";

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
    mockGet.mockResolvedValue(mockPublicKey);
    mockCreatePublicKey.mockReturnValue({
      export: vi.fn().mockReturnValue(mockJwk),
    });

    await getJwks(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.send).toHaveBeenCalledWith(
      JSON.stringify({
        keys: [
          {
            ...mockJwk,
            use: "sig",
            kid: "ecKid123",
            alg: "ES256",
          },
        ],
      }),
    );
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

  it("should throw error when SSM parameter name not set", async () => {
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
    mockGetClientRegistry.mockResolvedValue(mockClientRegistryWithMatchingName);

    await expect(
      getJwks(mockRequest as FastifyRequest, mockReply as FastifyReply),
    ).rejects.toThrow(
      "Environment variable MOCK_CLIENT_EC_PUBLIC_KEY_SSM_NAME is not set",
    );
  });

  it("should throw error when public key parameter is not set", async () => {
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
    ).rejects.toThrow("Public key parameter is not set");
  });
});
