import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { authorizeErrors } from "../../../../commons/utils/authorize/authorizeErrors.js";

const mockRedirectToClientRedirectUri = vi.fn();

vi.mock(import("../../utils/redirectToClientRedirectUri.js"), () => ({
  redirectToClientRedirectUri: mockRedirectToClientRedirectUri,
}));

const { goToClientRedirectUriGet } = await import("./handler.js");

describe("goToClientRedirectUriGet", () => {
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      session: {
        claims: {
          redirect_uri: "https://client.example.com/callback",
          state: "test-state",
        },
      },
      query: {},
      log: {
        error: vi.fn(),
      },
    } as unknown as FastifyRequest;

    mockReply = {
      redirect: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    mockRedirectToClientRedirectUri.mockResolvedValue(mockReply);
  });

  describe("successful scenarios", () => {
    it("redirects with auth code when code is provided", async () => {
      mockRequest.query = { code: "auth-code-123" };

      const result = await goToClientRedirectUriGet(mockRequest, mockReply);

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

    it("redirects with error when valid error params are provided", async () => {
      mockRequest.query = {
        error: "access_denied",
        error_description: "E1001",
      };

      const result = await goToClientRedirectUriGet(mockRequest, mockReply);

      expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        "https://client.example.com/callback",
        authorizeErrors.userAborted,
        "test-state",
        undefined,
      );
      expect(result).toBe(mockReply);
    });

    it("handles state parameter from query", async () => {
      mockRequest.query = {
        code: "auth-code-123",
        state: "query-state",
      };

      await goToClientRedirectUriGet(mockRequest, mockReply);

      expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        "https://client.example.com/callback",
        undefined,
        "test-state",
        "auth-code-123",
      );
    });
  });

  describe("error scenarios", () => {
    it("redirects to authorize error when claims are not defined", async () => {
      // @ts-expect-error
      mockRequest.session.claims = undefined;

      const result = await goToClientRedirectUriGet(mockRequest, mockReply);

      // eslint-disable-next-line vitest/prefer-called-with
      expect(mockRequest.log.error).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(result).toBe(mockReply);
    });

    it("redirects to authorize error when neither code nor valid error is provided", async () => {
      mockRequest.query = {};

      const result = await goToClientRedirectUriGet(mockRequest, mockReply);

      // eslint-disable-next-line vitest/prefer-called-with
      expect(mockRequest.log.error).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(result).toBe(mockReply);
    });

    it("redirects to authorize error when invalid error params are provided", async () => {
      mockRequest.query = {
        error: "invalid_error",
        error_description: "E9999",
      };

      const result = await goToClientRedirectUriGet(mockRequest, mockReply);

      // eslint-disable-next-line vitest/prefer-called-with
      expect(mockRequest.log.error).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(result).toBe(mockReply);
    });

    it("redirects to authorize error when redirectToClientRedirectUri throws", async () => {
      mockRequest.query = { code: "auth-code-123" };
      mockRedirectToClientRedirectUri.mockRejectedValue(
        new Error("Redirect failed"),
      );

      const result = await goToClientRedirectUriGet(mockRequest, mockReply);

      // eslint-disable-next-line vitest/prefer-called-with
      expect(mockRequest.log.error).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(result).toBe(mockReply);
    });
  });

  describe("query parameter validation", () => {
    it("handles optional query parameters correctly", async () => {
      mockRequest.query = {
        code: "auth-code-123",
        state: "optional-state",
        error: undefined,
        error_description: undefined,
      };

      await goToClientRedirectUriGet(mockRequest, mockReply);

      expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        "https://client.example.com/callback",
        undefined,
        "test-state",
        "auth-code-123",
      );
    });

    it("handles various authorize errors correctly", async () => {
      const testCases = [
        {
          error: "access_denied",
          error_description: "E1002",
          expectedError: authorizeErrors.accountDeletePasswordIncorrect,
        },
        {
          error: "invalid_request",
          error_description: "E2001",
          expectedError: authorizeErrors.algNotAllowed,
        },
        {
          error: "server_error",
          error_description: "E5001",
          expectedError: authorizeErrors.failedToCheckJtiUnusedAndSetUpSession,
        },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        mockRequest.query = {
          error: testCase.error,
          error_description: testCase.error_description,
        };

        await goToClientRedirectUriGet(mockRequest, mockReply);

        expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
          "https://client.example.com/callback",
          testCase.expectedError,
          "test-state",
          undefined,
        );
      }
    });
  });

  describe("edge cases", () => {
    it("handles missing session object", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      mockRequest.session = undefined as any;

      const result = await goToClientRedirectUriGet(mockRequest, mockReply);

      // eslint-disable-next-line vitest/prefer-called-with
      expect(mockRequest.log.error).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(result).toBe(mockReply);
    });

    it("handles empty query object", async () => {
      mockRequest.query = {};

      const result = await goToClientRedirectUriGet(mockRequest, mockReply);

      // eslint-disable-next-line vitest/prefer-called-with
      expect(mockRequest.log.error).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(result).toBe(mockReply);
    });
  });
});
