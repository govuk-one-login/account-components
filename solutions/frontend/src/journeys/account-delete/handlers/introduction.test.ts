import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockSendOtpChallenge = vi.fn();

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

const { introductionGetHandler, introductionPostHandler } =
  await import("./introduction.js");

describe("introduction handlers", () => {
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
        undefined,
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
      ).rejects.toThrowError();
    });
  });

  describe("introductionPostHandler", () => {
    it("should send OTP challenge and redirect to verify email address page on success", async () => {
      mockSendOtpChallenge.mockResolvedValue({ success: true });

      const result = await introductionPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockSendOtpChallenge).toHaveBeenCalledWith("test-public-sub");
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
      ).rejects.toThrowError();
    });

    it("should throw if access token is not available", async () => {
      // @ts-expect-error
      delete mockRequest.session.claims.account_management_api_access_token;

      await expect(
        introductionPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });

    it("should throw error when TooManyEmailCodesEntered", async () => {
      mockSendOtpChallenge.mockResolvedValue({
        success: false,
        error: "TooManyEmailCodesEntered",
      });

      await expect(
        introductionPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrowError("TooManyEmailCodesEntered");
    });

    it("should throw error when BlockedForEmailVerificationCodes", async () => {
      mockSendOtpChallenge.mockResolvedValue({
        success: false,
        error: "BlockedForEmailVerificationCodes",
      });

      await expect(
        introductionPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrowError("BlockedForEmailVerificationCodes");
    });
  });
});
