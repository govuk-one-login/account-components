import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { handler } from "./clientCallback.js";
import { SignJWT } from "jose";

vi.mock(import("../../../../commons/utils/getClientRegistry/index.js"), () => ({
  getClientRegistry: vi.fn(),
}));

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/awsClient/ssmClient/index.js"),
  () => ({
    getParametersProvider: vi.fn(() => ({
      get: vi.fn(),
    })),
  }),
);

vi.mock(import("jose"), () => ({
  SignJWT: vi.fn().mockImplementation(function (this: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, vitest/prefer-spy-on
    this.setProtectedHeader = vi.fn().mockReturnThis();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, vitest/prefer-spy-on
    this.setIssuedAt = vi.fn().mockReturnThis();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, vitest/prefer-spy-on
    this.setExpirationTime = vi.fn().mockReturnThis();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, vitest/prefer-spy-on
    this.sign = vi.fn().mockResolvedValue("mock-jwt-token");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this;
  }),

  importPKCS8: vi.fn().mockResolvedValue({}),
}));

const mockGetClientRegistry = vi.fn();

const mockGetParametersProvider = vi.fn();

const mockFetch = vi.fn();

vi.mocked(
  await import("../../../../commons/utils/getClientRegistry/index.js"),
).getClientRegistry = mockGetClientRegistry;

vi.mocked(
  await import("../../../../commons/utils/awsClient/ssmClient/index.js"),
).getParametersProvider = mockGetParametersProvider;

global.fetch = mockFetch;

describe("clientCallback handler", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      params: {},
      query: {},
    };

    mockReply = {
      render: vi.fn().mockReturnThis(),
      globals: {
        staticHash: "mockStaticHash",
        currentUrl: new URL(
          "http://localhost:6003/client-callback/test-client",
        ),
      },
    };

    process.env["API_TOKEN_ENDPOINT_URL"] = "http://localhost:6004/token";
    process.env["API_JOURNEY_OUTCOME_ENDPOINT_URL"] =
      "http://localhost:6004/journey-outcome";
    process.env["MOCK_CLIENT_EC_PRIVATE_KEY_SSM_NAME"] = "/mock/ec-private-key";
    process.env["MOCK_CLIENT_RSA_PRIVATE_KEY_SSM_NAME"] =
      "/mock/rsa-private-key";

    mockGetParametersProvider.mockReturnValue({
      get: vi.fn().mockResolvedValue("mock-private-key"),
    });
  });

  describe("parameter validation", () => {
    it("should render error template when client parameter is missing", async () => {
      mockRequest.params = {};

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          exception: expect.any(Error),
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should render error template when client parameter is not a string", async () => {
      mockRequest.params = { client: 123 };

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          exception: expect.any(Error),
        },
      );
      expect(result).toBe(mockReply);
    });
  });

  describe("client lookup", () => {
    beforeEach(() => {
      mockRequest.params = { client: "test-client" };
    });

    it("should render error template when client is not found", async () => {
      mockGetClientRegistry.mockResolvedValue([
        {
          client_name: "Other Client",
          client_id: "other-id",
        },
      ]);

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          exception: expect.any(Error),
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should render error template when client registry is empty", async () => {
      mockGetClientRegistry.mockResolvedValue([]);

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          exception: expect.any(Error),
        },
      );
      expect(result).toBe(mockReply);
    });
  });

  describe("successful rendering", () => {
    beforeEach(() => {
      mockRequest.params = { client: "test-client" };
      mockGetClientRegistry.mockResolvedValue([
        {
          client_name: "test-client",
          client_id: "test-id",
        },
      ]);
    });

    it("should render template with error details for error response", async () => {
      mockRequest.query = {
        error: "access_denied",
        error_description: "User denied access",
      };

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          client: "test-client (test-id)",
          errorDetails: {
            error: "access_denied",
            error_description: "User denied access",
          },
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should render template with error details including optional state", async () => {
      mockRequest.query = {
        error: "invalid_request",
        error_description: "Invalid request parameters",
        state: "xyz789",
      };

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          client: "test-client (test-id)",
          errorDetails: {
            error: "invalid_request",
            error_description: "Invalid request parameters",
            state: "xyz789",
          },
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should render error template for invalid query parameters", async () => {
      mockRequest.query = {
        invalid_param: "value",
      };

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          exception: expect.any(Error),
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should handle successful token exchange with authorization code", async () => {
      mockRequest.query = {
        code: "auth-code-123",
      };

      const mockJourneyOutcome = { status: "success", data: "test-data" };

      mockFetch
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({
            access_token: "access-token-123",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue(mockJourneyOutcome),
        });

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:6004/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=authorization_code&code=auth-code-123&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&client_assertion=mock-jwt-token&redirect_uri=http%3A%2F%2Flocalhost%3A6003%2Fclient-callback%2Ftest-client",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:6004/journey-outcome",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer access-token-123",
          },
        },
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          client: "test-client (test-id)",
          journeyOutcomeDetails: mockJourneyOutcome,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          algorithm: expect.stringMatching(/^(RS256|ES256)$/),
        },
      );
      expect(result).toBe(mockReply);
    });
  });

  describe("edge cases", () => {
    beforeEach(() => {
      mockRequest.params = { client: "test-client" };
      mockGetClientRegistry.mockResolvedValue([
        {
          client_name: "test-client",
          client_id: "test-id",
        },
      ]);
    });

    it("should render error template when getClientRegistry throws an error", async () => {
      mockRequest.params = { client: "test-client" };
      mockGetClientRegistry.mockRejectedValue(new Error("Registry error"));

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          exception: expect.any(Error),
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should render error template when token exchange fails", async () => {
      mockRequest.params = { client: "test-client" };
      mockRequest.query = {
        code: "auth-code-123",
      };
      mockGetClientRegistry.mockResolvedValue([
        {
          client_name: "test-client",
          client_id: "test-id",
        },
      ]);

      mockFetch.mockRejectedValue(new Error("Token exchange failed"));

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          exception: expect.any(Error),
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should handle authorization code with state parameter", async () => {
      mockRequest.query = {
        code: "auth-code-123",
        state: "abc123",
      };

      const mockJourneyOutcome = { status: "success", data: "test-data" };

      mockFetch
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({
            access_token: "access-token-123",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue(mockJourneyOutcome),
        });

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          client: "test-client (test-id)",
          journeyOutcomeDetails: mockJourneyOutcome,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          algorithm: expect.stringMatching(/^(RS256|ES256)$/),
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should use RSA algorithm when Math.random returns < 0.5", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.3);

      mockRequest.query = { code: "auth-code-123" };
      mockFetch
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({
            access_token: "access-token-123",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ status: "success" }),
        });

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockGetParametersProvider().get).toHaveBeenCalledWith(
        "/mock/rsa-private-key",
        { maxAge: 900 },
      );

      expect(
        // eslint-disable-next-line @typescript-eslint/unbound-method
        vi.mocked(SignJWT).mock.instances[0]?.setProtectedHeader,
      ).toHaveBeenCalledWith({ alg: "RS256", kid: "rsaKid123" });
    });

    it("should use EC algorithm when Math.random returns >= 0.5", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.7);

      mockRequest.query = { code: "auth-code-123" };
      mockFetch
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({
            access_token: "access-token-123",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ status: "success" }),
        });

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockGetParametersProvider().get).toHaveBeenCalledWith(
        "/mock/ec-private-key",
        { maxAge: 900 },
      );

      expect(
        // eslint-disable-next-line @typescript-eslint/unbound-method
        vi.mocked(SignJWT).mock.instances[0]?.setProtectedHeader,
      ).toHaveBeenCalledWith({ alg: "ES256", kid: "ecKid123" });
    });
  });
});
