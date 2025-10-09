import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const expectedResponse = {
  availableClients: [
    {
      client_id: "123456789",
      client_name: "Dummy Auth",
      jwks_uri: "https://signin.account.gov.uk/.well-known/jwks.json",
      redirect_uris: ["https://signin.account.gov.uk/acm-callback"],
      scope: "am-account-delete",
    },
    {
      client_id: "234567890",
      client_name: "Dummy Home",
      jwks_uri: "https://home.account.gov.uk/.well-known/jwks.json",
      redirect_uris: ["https://home.account.gov.uk/acm-callback"],
      scope: "am-account-delete",
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
  availableScopes: ["reverification"],
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
        client_id: "123456789",
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
          "https://signin.account.gov.uk/acm-callback?request=mock-request-object&response_type=code&scope=am-account-delete&client_id=123456789",
      },
    );
  });
});
