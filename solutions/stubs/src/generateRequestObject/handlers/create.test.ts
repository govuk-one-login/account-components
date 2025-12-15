import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

// @ts-expect-error
vi.mock(import("../../../../commons/utils/getEnvironment/index.js"), () => ({
  getEnvironment: vi.fn(() => "local"),
}));

// @ts-expect-error
vi.mock(import("node:crypto"), () => ({
  randomUUID: vi.fn(() => "mock-uuid"),
}));

describe("createRequestObjectGet", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    mockRequest = {
      cookies: {},
    };
    mockReply = {
      render: vi.fn(),
      setCookie: vi.fn(),
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
        originalRequest: undefined,
      }),
    );
  });

  it("should set cookies when they don't exist", async () => {
    const { createRequestObjectGet } = await import("./create.js");

    await createRequestObjectGet(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockReply.setCookie).toHaveBeenCalledWith(
      "di-persistent-session-id",
      "mock-uuid",
      {
        httpOnly: true,
        secure: false,
      },
    );
    expect(mockReply.setCookie).toHaveBeenCalledWith(
      "gs",
      "mock-uuid.mock-uuid",
      {
        httpOnly: true,
        secure: false,
      },
    );
  });

  it("should not set cookies when they already exist", async () => {
    const { createRequestObjectGet } = await import("./create.js");
    mockRequest.cookies = {
      "di-persistent-session-id": "existing-session-id",
      gs: "existing-gs",
    };

    await createRequestObjectGet(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockReply.setCookie).not.toHaveBeenCalled();
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
      cookies: {},
      body: {
        client_id: "23456789012345678901234567890123",
        scenario: "valid",
        scope: "account-delete",
        jti: "nonce-123",
        exp: "1234567890",
        iss: "issuer.example.com",
        user: "default",
        state: "example-state",
        refresh_token: "true",
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
    process.env["AUTHORIZE_URL"] = "http://localhost:6004/authorize";
    const handler = createRequestObjectPost(mockFastify as FastifyInstance);

    await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.render).toHaveBeenCalledWith(
      "generateRequestObject/handlers/create.njk",
      expect.objectContaining({
        authorizeUrl:
          "http://localhost:6004/authorize?client_id=23456789012345678901234567890123&scope=account-delete&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A6003%2Fhome%2Fcallback&request=mock-request-object",
        jwtPayload: { foo: "bar" },
        jwtHeader: { alg: "ES256" },
        originalRequest: mockRequest.body,
      }),
    );
  });
});
