import { expect, it, describe, vi, beforeEach } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifySessionObject } from "@fastify/session";
import type { Claims } from "../../../../commons/utils/authorize/getClaimsSchema.js";
import { authorizeErrors } from "../../../../commons/utils/authorize/authorizeErrors.js";

const mockRedirectToClientRedirectUri = vi.fn();

vi.mock(import("../../utils/redirectToClientRedirectUri.js"), () => ({
  redirectToClientRedirectUri: mockRedirectToClientRedirectUri,
}));

const { goToClientRedirectUriHandler } = await import("./handler.js");

describe("goToClientRedirectUriHandler", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockClaims: Claims;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClaims = {
      redirect_uri: "https://client.example.com/callback",
      state: "test-state",
    } as Claims;

    mockRequest = {
      method: "POST",
      body: {},
      query: {},
      session: {
        claims: mockClaims,
      } as FastifySessionObject,
      // @ts-expect-error
      log: {
        error: vi.fn(),
      },
    };

    mockReply = {
      redirect: vi.fn().mockReturnThis(),
    };

    mockRedirectToClientRedirectUri.mockResolvedValue(mockReply);
  });

  describe("successful scenarios", () => {
    it("should redirect with authorization code when provided", async () => {
      mockRequest.body = { code: "auth-code-123" };

      const result = await goToClientRedirectUriHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        "https://client.example.com/callback",
        undefined,
        "test-state",
        "auth-code-123",
      );
      expect(result).toBe(mockReply);
    });

    it("should redirect with error when valid error params provided", async () => {
      mockRequest.body = {
        error: "access_denied",
        error_description: "E1001",
      };

      await goToClientRedirectUriHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        "https://client.example.com/callback",
        authorizeErrors.userAborted,
        "test-state",
        undefined,
      );
    });

    it("should handle GET request with query parameters", async () => {
      // @ts-expect-error
      mockRequest.method = "GET";
      mockRequest.query = { code: "auth-code-456" };

      await goToClientRedirectUriHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        "https://client.example.com/callback",
        undefined,
        "test-state",
        "auth-code-456",
      );
    });

    it("should handle both code and error params", async () => {
      mockRequest.body = {
        code: "auth-code-123",
        error: "access_denied",
        error_description: "E1001",
      };

      await goToClientRedirectUriHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        "https://client.example.com/callback",
        authorizeErrors.userAborted,
        "test-state",
        "auth-code-123",
      );
    });
  });

  describe("error scenarios", () => {
    it("should redirect to authorize error when claims are not defined", async () => {
      mockRequest.session = {} as FastifySessionObject;
      mockRequest.body = { code: "auth-code-123" };

      const result = await goToClientRedirectUriHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.error).toHaveBeenCalledWith(expect.any(Error));
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(mockRedirectToClientRedirectUri).not.toHaveBeenCalled();
      expect(result).toBe(mockReply);
    });

    it("should redirect to authorize error when session is not defined", async () => {
      delete mockRequest.session;
      mockRequest.body = { code: "auth-code-123" };

      const result = await goToClientRedirectUriHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.error).toHaveBeenCalledWith(expect.any(Error));
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(mockRedirectToClientRedirectUri).not.toHaveBeenCalled();
      expect(result).toBe(mockReply);
    });

    it("should redirect to authorize error when neither code nor valid error provided", async () => {
      mockRequest.body = {};

      const result = await goToClientRedirectUriHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.error).toHaveBeenCalledWith(expect.any(Error));
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(mockRedirectToClientRedirectUri).not.toHaveBeenCalled();
      expect(result).toBe(mockReply);
    });

    it("should redirect to authorize error when invalid error params provided", async () => {
      mockRequest.body = {
        error: "invalid_error",
        error_description: "E9999",
      };

      const result = await goToClientRedirectUriHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.error).toHaveBeenCalledWith(expect.any(Error));
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(mockRedirectToClientRedirectUri).not.toHaveBeenCalled();
      expect(result).toBe(mockReply);
    });

    it("should redirect to authorize error when validation fails", async () => {
      mockRequest.body = {
        code: 123,
      };

      const result = await goToClientRedirectUriHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.error).toHaveBeenCalledWith(expect.any(Error));
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(mockRedirectToClientRedirectUri).not.toHaveBeenCalled();
      expect(result).toBe(mockReply);
    });

    it("should handle redirectToClientRedirectUri throwing an error", async () => {
      mockRequest.body = { code: "auth-code-123" };
      mockRedirectToClientRedirectUri.mockRejectedValue(
        new Error("Redirect failed"),
      );

      const result = await goToClientRedirectUriHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.error).toHaveBeenCalledWith(expect.any(Error));
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(result).toBe(mockReply);
    });
  });

  describe("different error types", () => {
    it("should handle server_error type", async () => {
      mockRequest.body = {
        error: "server_error",
        error_description: "E5001",
      };

      await goToClientRedirectUriHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        "https://client.example.com/callback",
        authorizeErrors.failedToCheckJtiUnusedAndSetUpSession,
        "test-state",
        undefined,
      );
    });

    it("should handle invalid_request type", async () => {
      mockRequest.body = {
        error: "invalid_request",
        error_description: "E2002",
      };

      await goToClientRedirectUriHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        "https://client.example.com/callback",
        authorizeErrors.jwsInvalid,
        "test-state",
        undefined,
      );
    });

    it("should handle unauthorized_client type", async () => {
      mockRequest.body = {
        error: "unauthorized_client",
        error_description: "E4001",
      };

      await goToClientRedirectUriHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        "https://client.example.com/callback",
        authorizeErrors.jwksTimeout,
        "test-state",
        undefined,
      );
    });
  });
});
