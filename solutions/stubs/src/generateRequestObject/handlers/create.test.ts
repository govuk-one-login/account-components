import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("createRequestObjectGet", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();
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
        availableClients: expect.any(Array),
        availableScopes: expect.any(Array),
        availableScenarios: expect.any(Array),
        availableUsers: expect.any(Array),
        authorizeUrl: undefined,
        jwtPayload: undefined,
        jwtHeader: undefined,
        originalRequest: undefined,
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
        scope: "am-account-delete",
        jti: "nonce-123",
        exp: "1234567890",
        iss: "issuer.example.com",
        user: "default",
      },
    };

    mockReply = {
      render: vi.fn(),
    };
  });

  it("should return the handler function", async () => {
    const { createRequestObjectPost } = await import("./create.js");
    const handler = createRequestObjectPost(mockFastify as FastifyInstance);

    expect(handler).toBeInstanceOf(Function);
  });

  it("should process request and render page with the correct data", async () => {
    const { createRequestObjectPost } = await import("./create.js");
    const handler = createRequestObjectPost(mockFastify as FastifyInstance);

    await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.render).toHaveBeenCalledWith(
      "generateRequestObject/handlers/create.njk",
      expect.objectContaining({
        authorizeUrl:
          "https://api.manage.local.account.gov.uk/authorize?client_id=23456789012345678901234567890123&scope=am-account-delete&response_type=code&redirect_uri=https%3A%2F%2Fhome.build.account.gov.uk%2Facm-callback&request=mock-request-object",
        jwtPayload: { foo: "bar" },
        jwtHeader: { alg: "ES256" },
        originalRequest: mockRequest.body,
      }),
    );
  });
});
