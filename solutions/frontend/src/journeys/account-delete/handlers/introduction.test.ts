import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

// @ts-expect-error
vi.mock(import("../../../utils/paths.js"), () => ({
  paths: {
    journeys: {
      "account-delete": {
        EMAIL_NOT_VERIFIED: {
          verifyEmailAddress: { path: "/delete-account/verify-email-address" },
        },
      },
    },
  },
}));

const mockSendOtpChallenge = vi.fn();
const mockRedirectToClientRedirectUri = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../../../commons/utils/accountManagementApiClient/index.js"),
  () => ({
    AccountManagementApiClient: vi.fn().mockImplementation(function () {
      return {
        sendOtpChallenge: mockSendOtpChallenge,
      };
    }),
  }),
);

vi.mock(import("../../../utils/redirectToClientRedirectUri.js"), () => ({
  redirectToClientRedirectUri: mockRedirectToClientRedirectUri,
}));

const { introductionGetHandler, introductionPostHandler } = await import(
  "./introduction.js"
);

describe("introduction handlers", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      session: {
        // @ts-expect-error
        claims: {
          access_token: "test-token",
          email: "test@example.com",
          redirect_uri: "https://example.com/callback",
          state: "test-state",
        },
      },
    };
    mockReply = {
      render: vi.fn().mockResolvedValue(undefined),
      redirect: vi.fn().mockReturnThis(),
    };
  });

  describe("introductionGetHandler", () => {
    it("should render introduction template", async () => {
      const result = await introductionGetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/introduction.njk",
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if reply.render is not available", async () => {
      delete mockReply.render;

      await expect(
        introductionGetHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrow();
    });
  });

  describe("introductionPostHandler", () => {
    it("should send OTP challenge and redirect to verify email address page", async () => {
      mockSendOtpChallenge.mockResolvedValue({ success: true });

      const result = await introductionPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockSendOtpChallenge).toHaveBeenCalledWith("test@example.com");
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "/delete-account/verify-email-address",
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if session claims are not available", async () => {
      delete mockRequest.session;

      await expect(
        introductionPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrow();
    });

    it.each([
      "RequestIsMissingParameters",
      "BlockedForEmailVerificationCodes",
      "TooManyEmailCodesEntered",
      "InvalidPrincipalInRequest",
      "AccountManagementApiUnexpectedError",
      "ErrorParsingResponseBody",
      "UnknownErrorResponse",
      "UnknownError",
    ] as const)(
      "should redirect to client redirect URI when sendOtpChallenge fails with %s",
      async (errorType) => {
        mockSendOtpChallenge.mockResolvedValue({
          success: false,
          error: errorType,
        });
        mockRedirectToClientRedirectUri.mockResolvedValue(mockReply);

        const result = await introductionPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockSendOtpChallenge).toHaveBeenCalledWith("test@example.com");
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
