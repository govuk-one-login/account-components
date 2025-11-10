import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply, FastifyBaseLogger } from "fastify";
import type { FastifySessionObject } from "@fastify/session";

const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockAddMetric = vi.fn();
const mockAddDimensions = vi.fn();
const mockGetRedirectToClientRedirectUri = vi.fn();

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
vi.mock(import("../../../../commons/utils/authorize/index.js"), () => ({
  getRedirectToClientRedirectUri: mockGetRedirectToClientRedirectUri,
  authorizeErrors: {
    failedToDeleteApiSession: {
      error: "server_error",
      error_description: "E5001",
    },
  },
}));

const { handler } = await import("./index.js");

describe("startSession handler", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    process.env["API_SESSION_COOKIE_DOMAIN"] = "example.com";
    process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";
    process.env["API_SESSIONS_TABLE_NAME"] = "test-sessions-table";

    mockRequest = {
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

    mockGetRedirectToClientRedirectUri.mockReturnValue(
      "https://client.com/callback?error=test",
    );
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
        { error: "server_error", error_description: "E5001" },
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
    it("should regenerate session and redirect to TODO page", async () => {
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
      expect(mockReply.redirect).toHaveBeenCalledWith("/TODO");
    });
  });

  describe("when unexpected error occurs", () => {
    it("should redirect to error page and log error", async () => {
      mockRequest.cookies = {};
      mockRequest.log = {
        warn: vi.fn().mockImplementation(() => {
          throw new Error("Unexpected error");
        }),
        error: vi.fn(),
      } as unknown as FastifyBaseLogger;

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

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

    it("should throw when AUTHORIZE_ERROR_PAGE_URL is not set", async () => {
      delete process.env["AUTHORIZE_ERROR_PAGE_URL"];
      mockRequest.cookies = {};

      await expect(
        handler(mockRequest as FastifyRequest, mockReply as FastifyReply),
      ).rejects.toThrow("AUTHORIZE_ERROR_PAGE_URL is not set");
    });
  });
});
