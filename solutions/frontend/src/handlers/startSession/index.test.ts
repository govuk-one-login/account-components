import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { FastifyRequest, FastifyReply, FastifyBaseLogger } from "fastify";
import type { FastifySessionObject } from "@fastify/session";
import type { ClientEntry } from "../../../../config/schema/types.js";
import { logger } from "../../../../commons/utils/logger/index.js";

const mockGet = vi.fn();
const mockAddMetric = vi.fn();
const mockAddDimensions = vi.fn();
const mockGetClientRegistry = vi.fn();
const mockGetClaimsSchema = vi.fn();
const mockParse = vi.fn();
const mockSafeParse = vi.fn();
const mockGetDotPath = vi.fn();
const mockDestroyApiSession = vi.fn();
const mockRedirectToAuthorizeErrorPage = vi.fn();
const mockDecodeJwt = vi.fn();

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: {
    addMetric: mockAddMetric,
    addDimensions: mockAddDimensions,
  },
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/logger/index.js"), () => ({
  logger: { appendKeys: vi.fn() },
  loggerAPIGatewayProxyHandlerWrapper: vi.fn(),
}));

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: () => ({
      get: mockGet,
    }),
  }),
);

vi.mock(import("../../utils/apiSession.js"), () => ({
  destroyApiSession: mockDestroyApiSession,
}));

vi.mock(import("../../utils/redirectToAuthorizeErrorPage.js"), () => ({
  redirectToAuthorizeErrorPage: mockRedirectToAuthorizeErrorPage,
}));

vi.mock(import("../../utils/paths.js"), () => ({
  initialJourneyPaths: {
    "testing-journey": "/testing-journey/step-1",
    "account-delete": "/account-delete/step-1",
  },
}));

vi.mock(import("jose"), () => ({
  decodeJwt: mockDecodeJwt,
}));

vi.mock(import("../../../../commons/utils/getClientRegistry/index.js"), () => ({
  getClientRegistry: mockGetClientRegistry,
}));

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/authorize/getClaimsSchema.js"),
  () => ({
    getClaimsSchema: mockGetClaimsSchema,
    Scope: {
      testingJourney: "testing-journey",
      accountDelete: "account-delete",
    },
  }),
);

// @ts-expect-error
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

const { handler } = await import("./index.js");

describe("startSession handler", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockClient: ClientEntry;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

    process.env["API_SESSIONS_TABLE_NAME"] = "test-sessions-table";
    process.env["SESSIONS_TABLE_NAME"] = "test-sessions-table";

    mockClient = {
      client_id: "test-client",
      scope: "testing-journey",
      redirect_uris: ["https://client.com/callback"],
      client_name: "Test Client",
      jwks_uri: "https://client.com/.well-known/jwks.json",
      consider_user_logged_in: false,
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
        sessionId: "test-session-id",
      } as unknown as FastifySessionObject,
    };

    mockReply = {
      redirect: vi.fn().mockReturnThis(),
    };

    mockGetClientRegistry.mockResolvedValue([mockClient]);
    mockGetClaimsSchema.mockReturnValue({});
    mockDestroyApiSession.mockResolvedValue(undefined);
    mockRedirectToAuthorizeErrorPage.mockResolvedValue(undefined);
    mockDecodeJwt.mockReturnValue({
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("query params validation", () => {
    it("should redirect to error page when client_id is missing", async () => {
      mockRequest.query = { redirect_uri: "https://client.com/callback" };

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRedirectToAuthorizeErrorPage).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
      );
    });

    it("should redirect to error page when redirect_uri is invalid", async () => {
      mockRequest.query = {
        client_id: "test-client",
        redirect_uri: "invalid-url",
      };

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRedirectToAuthorizeErrorPage).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
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
      expect(mockRedirectToAuthorizeErrorPage).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
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
      expect(mockRedirectToAuthorizeErrorPage).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
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
        ConsistentRead: true,
      });
      expect(mockRequest.log?.warn).toHaveBeenCalledWith("ApiSessionNotFound");
      expect(mockAddMetric).toHaveBeenCalledWith(
        "ApiSessionNotFound",
        "Count",
        1,
      );
      expect(mockRedirectToAuthorizeErrorPage).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
      );
    });

    it("should redirect to error page when API session has expired", async () => {
      mockRequest.cookies = { apisession: "test-session-id" };
      mockGet.mockResolvedValue({
        Item: {
          claims: {},
          expires: (Date.now() - 1000) / 1000, // Expired 1 second ago
        },
      });

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.log?.warn).toHaveBeenCalledWith("ApiSessionNotFound");
      expect(mockAddMetric).toHaveBeenCalledWith(
        "ApiSessionNotFound",
        "Count",
        1,
      );
      expect(mockRedirectToAuthorizeErrorPage).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
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
        Item: {
          claims: mockClaims,
          expires: (Date.now() + 60000) / 1000, // Valid for 1 minute
        },
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
        "InvalidClaimsInApiSession",
      );
      expect(mockAddMetric).toHaveBeenCalledWith(
        "InvalidClaimsInApiSession",
        "Count",
        1,
      );
      expect(mockRedirectToAuthorizeErrorPage).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
      );
    });

    it("should process valid claims", async () => {
      const mockClaims = {
        client_id: "test-client",
        redirect_uri: "https://client.com/callback",
        state: "test-state",
        sub: "user-123",
        scope: "testing-journey",
        access_token: "mock.jwt.token",
      };

      mockRequest.cookies = { apisession: "test-session-id" };
      mockGet.mockResolvedValue({
        Item: {
          claims: mockClaims,
          expires: (Date.now() + 60000) / 1000, // Valid for 1 minute
        },
      });

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
        scope: "testing-journey",
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.appendKeys).toHaveBeenCalledWith({
        client_id: "test-client",
        scope: "testing-journey",
      });
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
      expect(mockRedirectToAuthorizeErrorPage).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
      );
    });
  });

  describe("when session processing succeeds", () => {
    it("should regenerate session, set expiry and redirect", async () => {
      const mockClaims = {
        client_id: "test-client",
        redirect_uri: "https://client.com/callback",
        state: "test-state",
        sub: "user-123",
        scope: "testing-journey",
        access_token: "mock.jwt.token",
      };

      mockRequest.cookies = { apisession: "test-session-id" };
      mockGet.mockResolvedValue({
        Item: {
          claims: mockClaims,
          expires: (Date.now() + 60000) / 1000, // Valid for 1 minute
        },
      });

      mockSafeParse.mockReturnValue({
        success: true,
        output: mockClaims,
      });

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockGet).toHaveBeenCalledWith({
        TableName: "test-sessions-table",
        Key: { id: "test-session-id" },
        ConsistentRead: true,
      });
      expect(mockAddDimensions).toHaveBeenCalledWith({
        client_id: "test-client",
        scope: "testing-journey",
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.appendKeys).toHaveBeenCalledWith({
        client_id: "test-client",
        scope: "testing-journey",
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockRequest.session?.regenerate).toHaveBeenCalledWith();
      expect(mockRequest.session).toMatchObject({
        claims: mockClaims,
        user_id: "user-123",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expires: expect.any(Number),
      });
      expect(mockDecodeJwt).toHaveBeenCalledWith("mock.jwt.token");
      expect(mockDestroyApiSession).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
      );
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "/testing-journey/step-1",
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
      expect(mockRedirectToAuthorizeErrorPage).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
      );
    });
  });

  describe("session expiry calculation", () => {
    it("should cap session length at maximum when access token expires far in future", async () => {
      const mockClaims = {
        client_id: "test-client",
        redirect_uri: "https://client.com/callback",
        state: "test-state",
        sub: "user-123",
        scope: "testing-journey",
        access_token: "mock.jwt.token",
      };

      const now = Math.floor(Date.now() / 1000);
      const longExpiry = now + 10800;
      mockDecodeJwt.mockReturnValue({ exp: longExpiry });

      mockRequest.cookies = { apisession: "test-session-id" };
      mockGet.mockResolvedValue({
        Item: {
          claims: mockClaims,
          expires: (Date.now() + 60000) / 1000, // Valid for 1 minute
        },
      });
      mockSafeParse.mockReturnValue({ success: true, output: mockClaims });

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.session?.expires).toBe(1704117600);
    });

    it("should use access token expiry when within valid range", async () => {
      const mockClaims = {
        client_id: "test-client",
        redirect_uri: "https://client.com/callback",
        state: "test-state",
        sub: "user-123",
        scope: "testing-journey",
        access_token: "mock.jwt.token",
      };

      const now = Math.floor(Date.now() / 1000);
      const validExpiry = now + 3600;
      mockDecodeJwt.mockReturnValue({ exp: validExpiry });

      mockRequest.cookies = { apisession: "test-session-id" };
      mockGet.mockResolvedValue({
        Item: {
          claims: mockClaims,
          expires: (Date.now() + 60000) / 1000, // Valid for 1 minute
        },
      });
      mockSafeParse.mockReturnValue({ success: true, output: mockClaims });

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.session?.expires).toBe(1704114000);
    });
  });
});
