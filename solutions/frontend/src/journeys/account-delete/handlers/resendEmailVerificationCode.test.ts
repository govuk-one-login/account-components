import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockSharedSendOtpHandler = vi.fn();

vi.mock(import("../utils/sharedSendOtpHandler.js"), () => ({
  sharedSendOtpHandler: mockSharedSendOtpHandler,
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

    mockRequest = {
      session: {
        // @ts-expect-error
        claims: {
          account_management_api_access_token: "test-token",
          public_sub: "test-public-sub",
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
          emailAddress: "test@example.com",
          backLink: "/reset-delete/check-email",
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
      ).rejects.toThrow();
    });
  });

  describe("resendEmailVerificationCodePostHandler", () => {
    it("should delegate to sharedSendOtpHandler and return its result", async () => {
      mockSharedSendOtpHandler.mockResolvedValue(mockReply);

      const result = await resendEmailVerificationCodePostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockSharedSendOtpHandler).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
      );
      expect(result).toBe(mockReply);
    });
  });
});
