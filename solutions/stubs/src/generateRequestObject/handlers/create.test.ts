import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const expectedResponse = {
  availableClients: [
    {
      client_id: "ABCDEF12345678901234567890123456",
      scope: "am-account-delete",
      redirect_uris: ["https://signin.build.account.gov.uk/acm-callback"],
      client_name: "Auth",
      jwks_uri: "https://signin.build.account.gov.uk/.well-known/jwks.json",
    },
    {
      client_id: "23456789012345678901234567890123",
      scope: "am-account-delete",
      redirect_uris: ["https://home.build.account.gov.uk/acm-callback"],
      client_name: "Home",
      jwks_uri: "https://home.build.account.gov.uk/.well-known/jwks.json",
    },
    {
      client_id: "A1B2C3D4E5F6G7H8A1B2C3D4E5F6G7H8",
      scope: "am-account-delete",
      redirect_uris: ["https://nowhere"],
      client_name: "Invalid",
      jwks_uri: "https://nowhere/.well-known/jwks.json",
    },
  ],
  availableScenarios: [
    "valid",
    "invalidAlg",
    "noneAlg",
    "missingKid",
    "wrongKid",
    "expired",
    "iatInFuture",
  ],
  availableScopes: ["am-account-delete", "am-unknown"],
  redirect_uri: undefined,
};

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

    expect(mockReply.render).toHaveBeenCalledExactlyOnceWith(
      "generateRequestObject/handlers/create.njk",
      expectedResponse,
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
        body: "mock-request-object",
      } as unknown as Response),
    };

    mockRequest = {
      body: {
        client_id: "23456789012345678901234567890123",
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

    expect(mockReply.render).toHaveBeenCalledExactlyOnceWith(
      "generateRequestObject/handlers/create.njk",
      {
        ...expectedResponse,
        redirect_uri:
          "https://home.build.account.gov.uk/acm-callback?request=mock-request-object&response_type=code&scope=am-account-delete&client_id=23456789012345678901234567890123",
      },
    );
  });
});
