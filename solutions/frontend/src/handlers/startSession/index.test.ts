import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply, FastifyBaseLogger } from "fastify";
import type { FastifySessionObject } from "@fastify/session";
import type { ClientEntry } from "../../../../config/schema/types.js";

const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockAddMetric = vi.fn();
const mockAddDimensions = vi.fn();
const mockGetRedirectToClientRedirectUri = vi.fn();
const mockGetClientRegistry = vi.fn();
const mockGetClaimsSchema = vi.fn();
const mockParse = vi.fn();
const mockSafeParse = vi.fn();
const mockGetDotPath = vi.fn();
const mockTempSuccessfulJourney = vi.fn();

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: {
    addMetric: mockAddMetric,
    addDimensions: mockAddDimensions,
  },
}));

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: () => ({
      get: mockGet,
      delete: mockDelete,
    }),
  }),
);

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/authorize/authorizeErrors.js"),
  () => ({
    getRedirectToClientRedirectUri: mockGetRedirectToClientRedirectUri,
    authorizeErrors: {
      failedToDeleteApiSession: {
        description: "E5004",
        type: "server_error",
      },
    },
  }),
);

vi.mock(import("../../../../commons/utils/getClientRegistry/index.js"), () => ({
  getClientRegistry: mockGetClientRegistry,
}));

vi.mock(
  import("../../../../commons/utils/authorize/getClaimsSchema.js"),
  () => ({
    getClaimsSchema: mockGetClaimsSchema,
  }),
);

vi.mock(import("valibot"), () => ({
  parse: mockParse,
  safeParse: mockSafeParse,
  getDotPath: mockGetDotPath,
  object: vi.fn(),
  pipe: vi.fn(),
  string: vi.fn(),
  nonEmpty: vi.fn(),
  url: vi.fn(),
  optional: vi.fn(),
}));

vi.mock(import("./tempSuccessfulJourney.js"), () => ({
  tempSuccessfulJourney: mockTempSuccessfulJourney,
}));

const { handler } = await import("./index.js");

describe("startSession handler", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockClient: ClientEntry;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTempSuccessfulJourney.mockResolvedValue(mockReply);

    process.env["API_SESSION_COOKIE_DOMAIN"] = "example.com";
    process.env["API_SESSIONS_TABLE_NAME"] = "test-sessions-table";

    mockClient = {
      client_id: "test-client",
      scope: "account-delete",
      redirect_uris: ["https://client.com/callback"],
      client_name: "Test Client",
      jwks_uri: "https://client.com/.well-known/jwks.json",
    };

    mockParse.mockImplementation((_, data: unknown) => data);
    mockSafeParse.mockReturnValue({ success: true, output: {} });
    mockGetDotPath.mockReturnValue("client_id");

    mockRequest = {
      query: {
        client_id: "test-client",
        redirect_uri: "https://client.com/callback",
        state: "test-state",
      },
      cookies: {},
      log: {
        warn: vi.fn(),
        error: vi.fn(),
      } as unknown as FastifyBaseLogger,
      session: {
        regenerate: vi.fn(),
      } as unknown as FastifySessionObject,
    };

    mockReply = {
      setCookie: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
    };

    mockGetClientRegistry.mockResolvedValue([mockClient]);
    mockGetClaimsSchema.mockReturnValue({});
    mockGetRedirectToClientRedirectUri.mockReturnValue(
      "https://client.com/callback?error=test",
    );
  });

  describe("query params validation", () => {
    it("should redirect to error page when client_id is missing", async () => {
      mockRequest.query = { redirect_uri: "https://client.com/callback" };

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.redirect).toHaveBeenCalledWith(
        "https://example.com/error",
      );
    });

    it("should redirect to error page when redirect_uri is invalid", async () => {
      mockRequest.query = {
        client_id: "test-client",
        redirect_uri: "invalid-url",
      };

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.redirect).toHaveBeenCalledWith(
        "https://example.com/error",
      );
    });

    it("should accept valid query params", async () => {
      mockRequest.cookies = { apisession: "test-session-id" };
      mockGet.mockResolvedValue({ Item: null });

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockGetClientRegistry).toHaveBeenCalledWith();
    });
  });

  describe("client registry validation", () => {
    it("should redirect to error page when client is not found", async () => {
      mockGetClientRegistry.mockResolvedValue([]);

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.log?.warn).toHaveBeenCalledWith("ClientNotFound");
      expect(mockAddMetric).toHaveBeenCalledWith("ClientNotFound", "Count", 1);
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "https://example.com/error",
      );
    });

    it("should find client in registry", async () => {
      mockRequest.cookies = { apisession: "test-session-id" };
      mockGet.mockResolvedValue({ Item: null });

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockGetClientRegistry).toHaveBeenCalledWith();
      expect(mockRequest.log?.warn).toHaveBeenCalledWith("ApiSessionNotFound");
    });
  });

  describe("when API session cookie is not set", () => {
    it("should redirect to error page and log warning", async () => {
      mockRequest.cookies = {};

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.log?.warn).toHaveBeenCalledWith(
        "ApiSessionCookieNotSet",
      );
      expect(mockAddMetric).toHaveBeenCalledWith(
        "ApiSessionCookieNotSet",
        "Count",
        1,
      );
      expect(mockReply.setCookie).toHaveBeenCalledWith("apisession", "", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        domain: "example.com",
        maxAge: 0,
      });
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "https://example.com/error",
      );
    });
  });

  describe("when API session is not found in database", () => {
    it("should redirect to error page and log warning", async () => {
      mockRequest.cookies = { apisession: "test-session-id" };
      mockGet.mockResolvedValue({ Item: null });

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockGet).toHaveBeenCalledWith({
        TableName: "test-sessions-table",
        Key: { id: "test-session-id" },
      });
      expect(mockRequest.log?.warn).toHaveBeenCalledWith("ApiSessionNotFound");
      expect(mockAddMetric).toHaveBeenCalledWith(
        "ApiSessionNotFound",
        "Count",
        1,
      );
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "https://example.com/error",
      );
    });
  });

  describe("claims validation", () => {
    it("should redirect to error page when claims are invalid", async () => {
      const mockClaims = {
        client_id: "wrong-client",
        redirect_uri: "https://client.com/callback",
        state: "test-state",
        sub: "user-123",
      };

      mockRequest.cookies = { apisession: "test-session-id" };
      mockGet.mockResolvedValue({
        Item: { claims: mockClaims },
      });

      mockSafeParse.mockReturnValue({
        success: false,
        issues: [{ path: [{ key: "client_id" }] }],
      });

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockGetClaimsSchema).toHaveBeenCalledWith(
        mockClient,
        "https://client.com/callback",
        "test-state",
      );
      expect(mockRequest.log?.warn).toHaveBeenCalledWith(
        {
          client_id: "test-client",
          claims_with_issues: ["client_id"],
        },
        "InvalidClaims",
      );
      expect(mockAddMetric).toHaveBeenCalledWith("InvalidClaims", "Count", 1);
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "https://example.com/error",
      );
    });

    it("should process valid claims", async () => {
      const mockClaims = {
        client_id: "test-client",
        redirect_uri: "https://client.com/callback",
        state: "test-state",
        sub: "user-123",
      };

      mockRequest.cookies = { apisession: "test-session-id" };
      mockGet.mockResolvedValue({
        Item: { claims: mockClaims },
      });
      mockDelete.mockResolvedValue({});

      mockSafeParse.mockReturnValue({
        success: true,
        output: mockClaims,
      });

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockGetClaimsSchema).toHaveBeenCalledWith(
        mockClient,
        "https://client.com/callback",
        "test-state",
      );
      expect(mockAddDimensions).toHaveBeenCalledWith({
        client_id: "test-client",
      });
    });
  });

  describe("when API session delete fails", () => {
    it("should redirect to client with error", async () => {
      const mockClaims = {
        client_id: "test-client",
        redirect_uri: "https://client.com/callback",
        state: "test-state",
        sub: "user-123",
      };

      mockRequest.cookies = { apisession: "test-session-id" };
      mockGet.mockResolvedValue({
        Item: { claims: mockClaims },
      });
      mockDelete.mockRejectedValue(new Error("Delete failed"));

      mockSafeParse.mockReturnValue({
        success: true,
        output: mockClaims,
      });

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.log?.error).toHaveBeenCalledWith(
        expect.any(Error),
        "ApiSessionDeleteError",
      );
      expect(mockAddMetric).toHaveBeenCalledWith(
        "ApiSessionDeleteError",
        "Count",
        1,
      );
      expect(mockAddDimensions).toHaveBeenCalledWith({
        client_id: "test-client",
      });
      expect(mockGetRedirectToClientRedirectUri).toHaveBeenCalledWith(
        "https://client.com/callback",
        { type: "server_error", description: "E5004" },
        "test-state",
      );
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "https://client.com/callback?error=test",
      );
    });
  });

  describe("when API session get fails", () => {
    it("should redirect to error page and log error", async () => {
      mockRequest.cookies = { apisession: "test-session-id" };
      mockGet.mockRejectedValue(new Error("Get failed"));

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.log?.error).toHaveBeenCalledWith(
        expect.any(Error),
        "ApiSessionGetError",
      );
      expect(mockAddMetric).toHaveBeenCalledWith(
        "ApiSessionGetError",
        "Count",
        1,
      );
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "https://example.com/error",
      );
    });
  });

  describe("when session processing succeeds", () => {
    it("should regenerate session and redirect", async () => {
      const mockClaims = {
        client_id: "test-client",
        redirect_uri: "https://client.com/callback",
        state: "test-state",
        sub: "user-123",
      };

      mockRequest.cookies = { apisession: "test-session-id" };
      mockGet.mockResolvedValue({
        Item: { claims: mockClaims },
      });
      mockDelete.mockResolvedValue({});

      mockSafeParse.mockReturnValue({
        success: true,
        output: mockClaims,
      });

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockGet).toHaveBeenCalledWith({
        TableName: "test-sessions-table",
        Key: { id: "test-session-id" },
      });
      expect(mockDelete).toHaveBeenCalledWith({
        TableName: "test-sessions-table",
        Key: { id: "test-session-id" },
      });
      expect(mockAddDimensions).toHaveBeenCalledWith({
        client_id: "test-client",
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockRequest.session?.regenerate).toHaveBeenCalledWith();
      expect(mockRequest.session).toMatchObject({
        claims: mockClaims,
        user_id: "user-123",
      });
      expect(mockReply.setCookie).toHaveBeenCalledWith("apisession", "", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        domain: "example.com",
        maxAge: 0,
      });
      expect(mockTempSuccessfulJourney).toHaveBeenCalledWith(
        mockReply,
        mockClaims,
      );
    });
  });

  describe("when unexpected error occurs", () => {
    it("should redirect to error page and log error", async () => {
      mockGetClientRegistry.mockRejectedValue(new Error("Unexpected error"));

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.log?.error).toHaveBeenCalledWith(
        expect.any(Error),
        "StartSessionError",
      );
      expect(mockAddMetric).toHaveBeenCalledWith(
        "StartSessionError",
        "Count",
        1,
      );
      expect(mockReply.setCookie).toHaveBeenCalledWith("apisession", "", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        domain: "example.com",
        maxAge: 0,
      });
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "https://example.com/error",
      );
    });
  });

  describe("environment variable validation", () => {
    it("should throw when API_SESSION_COOKIE_DOMAIN is not set", async () => {
      delete process.env["API_SESSION_COOKIE_DOMAIN"];
      mockRequest.cookies = {};

      await expect(
        handler(mockRequest as FastifyRequest, mockReply as FastifyReply),
      ).rejects.toThrow("API_SESSION_COOKIE_DOMAIN is not set");
    });
  });
});
