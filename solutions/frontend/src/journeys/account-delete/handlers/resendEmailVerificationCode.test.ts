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

const mockHandleSendOtpChallenge = vi.fn();

vi.mock(import("../utils/handleSendOtpChallenge.js"), () => ({
  handleSendOtpChallenge: mockHandleSendOtpChallenge,
}));

const {
  resendEmailVerificationCodeGetHandler,
  resendEmailVerificationCodePostHandler,
} = await import("./resendEmailVerificationCode.js");

describe("resendEmailVerificationCode handlers", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {};
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
      ).rejects.toThrowError();
    });
  });

  describe("resendEmailVerificationCodePostHandler", () => {
    it("should handle OTP challenge and redirect to verify email address page on success", async () => {
      mockHandleSendOtpChallenge.mockResolvedValue({ success: true });

      const result = await resendEmailVerificationCodePostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockHandleSendOtpChallenge).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
      );
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "/delete-account/verify-email-address",
      );
      expect(result).toBe(mockReply);
    });

    it("should return early when OTP challenge fails", async () => {
      mockHandleSendOtpChallenge.mockResolvedValue({ success: false });

      const result = await resendEmailVerificationCodePostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockHandleSendOtpChallenge).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
      );
      expect(mockReply.redirect).not.toHaveBeenCalled();
      expect(result).toBe(mockReply);
    });
  });
});
