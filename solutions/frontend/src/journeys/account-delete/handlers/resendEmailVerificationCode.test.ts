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

const {
  resendEmailVerificationCodeGetHandler,
  resendEmailVerificationCodePostHandler,
} = await import("./resendEmailVerificationCode.js");

describe("resendEmailVerificationCode handlers", () => {
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
        },
      },
    };
    mockReply = {
      render: vi.fn().mockResolvedValue(undefined),
      redirect: vi.fn().mockReturnThis(),
    };
  });

  describe("resendEmailVerificationCodeGetHandler", () => {
    it("should render resend email verification code template with verify code link", async () => {
      const result = await resendEmailVerificationCodeGetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/resendEmailVerificationCode.njk",
        {
          verifyCodeLinkUrl: "/delete-account/verify-email-address",
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if reply.render is not available", async () => {
      delete mockReply.render;

      await expect(
        resendEmailVerificationCodeGetHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrow();
    });
  });

  describe("resendEmailVerificationCodePostHandler", () => {
    it("should send OTP challenge and redirect to verify email address page", async () => {
      mockSendOtpChallenge.mockResolvedValue({ ok: true });

      const result = await resendEmailVerificationCodePostHandler(
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
        resendEmailVerificationCodePostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrow();
    });
  });
});
