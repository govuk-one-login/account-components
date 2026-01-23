import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockDeleteAccount = vi.fn();
const mockRedirectToClientRedirectUri = vi.fn();
const mockCompleteJourney = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../../../commons/utils/accountManagementApiClient/index.js"),
  () => ({
    AccountManagementApiClient: vi.fn().mockImplementation(function () {
      return {
        deleteAccount: mockDeleteAccount,
      };
    }),
  }),
);

vi.mock(import("../../../utils/redirectToClientRedirectUri.js"), () => ({
  redirectToClientRedirectUri: mockRedirectToClientRedirectUri,
}));

vi.mock(import("../../utils/completeJourney.js"), () => ({
  completeJourney: mockCompleteJourney,
}));

const { confirmGetHandler, confirmPostHandler } = await import("./confirm.js");

describe("confirm handlers", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      session: {
        // @ts-expect-error
        claims: {
          account_management_api_access_token: "test-token",
          email: "test@example.com",
          redirect_uri: "https://example.com/callback",
          state: "test-state",
        },
      },
    };
    mockReply = {
      render: vi.fn().mockResolvedValue(undefined),
    } as unknown as FastifyReply;
  });

  describe("confirmGetHandler", () => {
    it("should render confirm template", async () => {
      process.env["CONTACT_URL"] = "https://example.com/contact";

      const result = await confirmGetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/confirm.njk",
        undefined,
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if reply.render is not available", async () => {
      delete mockReply.render;

      await expect(
        confirmGetHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });
  });

  describe("confirmPostHandler", () => {
    it("should delete account and complete journey when successful", async () => {
      mockDeleteAccount.mockResolvedValue({ success: true });
      mockCompleteJourney.mockResolvedValue(mockReply);

      const result = await confirmPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockDeleteAccount).toHaveBeenCalledWith("test@example.com");
      expect(mockCompleteJourney).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        mockRequest.session?.claims,
      );
      expect(result).toBe(mockReply);
    });

    it.each([
      "RequestIsMissingParameters",
      "AccountDoesNotExist",
      "ErrorValidatingResponseBody",
      "ErrorParsingResponseBodyJson",
      "ErrorValidatingErrorResponseBody",
      "ErrorParsingErrorResponseBodyJson",
      "UnknownErrorResponse",
      "UnknownError",
    ] as const)(
      "should redirect to client redirect URI when deleteAccount fails with %s",
      async (errorType) => {
        mockDeleteAccount.mockResolvedValue({
          success: false,
          error: errorType,
        });
        mockRedirectToClientRedirectUri.mockResolvedValue(mockReply);

        const result = await confirmPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockDeleteAccount).toHaveBeenCalledWith("test@example.com");
        expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
          "https://example.com/callback",
          { description: "E1000", type: "access_denied" },
          "test-state",
        );
        expect(result).toBe(mockReply);
      },
    );
  });
});
