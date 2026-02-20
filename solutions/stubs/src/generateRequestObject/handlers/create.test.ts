import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

// @ts-expect-error
vi.mock(import("node:crypto"), () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => "mocked-hash"),
  })),
}));

vi.mock(import("../utils/getClientRegistryWithInvalidClient/index.js"), () => ({
  getClientRegistryWithInvalidClient: vi.fn().mockResolvedValue([
    {
      client_id: "23456789012345678901234567890123",
      redirect_uris: ["http://localhost:6003/home/callback"],
    },
  ]),
}));

describe("createRequestObjectGet", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    mockRequest = {};
    mockReply = {
      render: vi.fn(),
    };
  });

  it("should render the create request object form", async () => {
    const { createRequestObjectGet } = await import("./create.js");

    await createRequestObjectGet(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockReply.render).toHaveBeenCalledWith(
      "generateRequestObject/handlers/create.njk",
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        availableClients: expect.any(Array),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        availableScopes: expect.any(Array),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        availableScenarios: expect.any(Array),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        availableUsers: expect.any(Array),
        authorizeUrl: undefined,
        jwtPayload: undefined,
        jwtHeader: undefined,
        originalRequestBody: undefined,
      }),
    );
  });
});

describe("createRequestObjectPost", () => {
  let mockFastify: Partial<FastifyInstance>;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFastify = {
      inject: vi.fn().mockResolvedValue({
        body: JSON.stringify({
          encryptedJar: "mock-request-object",
          jwtPayload: { foo: "bar" },
          jwtHeader: { alg: "ES256" },
        }),
      } as unknown as Response),
    };

    mockRequest = {
      body: {
        client_id: "23456789012345678901234567890123",
        scenario: "valid",
        scope: "account-delete",
        jti: "nonce-123",
        exp: "1234567890",
        iss: "issuer.example.com",
        user: "default",
        state: "example-state",
        user_email_address: "test@test.com",
        account_management_api_authenticate_scenario: "successful",
        account_management_api_deleteAccount_scenario: "successful",
        account_management_api_sendOtpChallenge_scenario: "successful",
        account_management_api_verifyOtpChallenge_scenario: "successful",
        account_data_api_createPassKey_scenario: "successful",
      },
    };

    mockReply = {
      render: vi.fn(),
      setCookie: vi.fn(),
    };
  });

  it("should return the handler function", async () => {
    const { createRequestObjectPost } = await import("./create.js");
    const handler = createRequestObjectPost(mockFastify as FastifyInstance);

    expect(handler).toBeInstanceOf(Function);
  });

  it("should process request and render page with the correct data", async () => {
    const { createRequestObjectPost } = await import("./create.js");
    process.env["AUTHORIZE_URL"] = "http://localhost:6002/authorize";
    process.env["ROOT_DOMAIN"] = "example.com";
    process.env["ENVIRONMENT"] = "production";
    const handler = createRequestObjectPost(mockFastify as FastifyInstance);

    await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.setCookie).toHaveBeenCalledWith(
      "amc",
      "mocked-hash",
      expect.objectContaining({
        secure: true,
        httpOnly: true,
        domain: "example.com",
      }),
    );

    expect(mockReply.render).toHaveBeenCalledWith(
      "generateRequestObject/handlers/create.njk",
      expect.objectContaining({
        authorizeUrl:
          "http://localhost:6002/authorize?client_id=23456789012345678901234567890123&scope=account-delete&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A6003%2Fhome%2Fcallback&request=mock-request-object",
        jwtPayload: { foo: "bar" },
        jwtHeader: { alg: "ES256" },
        originalRequestBody: mockRequest.body,
      }),
    );
  });

  it("should set secure to false when environment is local", async () => {
    const { createRequestObjectPost } = await import("./create.js");
    process.env["AUTHORIZE_URL"] = "http://localhost:6002/authorize";
    process.env["ROOT_DOMAIN"] = "example.com";
    process.env["ENVIRONMENT"] = "local";
    const handler = createRequestObjectPost(mockFastify as FastifyInstance);

    await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.setCookie).toHaveBeenCalledWith(
      "amc",
      "mocked-hash",
      expect.objectContaining({
        secure: false,
        httpOnly: true,
        domain: "example.com",
      }),
    );
  });
});
