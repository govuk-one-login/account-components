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
const mockGetAnalyticsSettings = vi.fn();

vi.mock(import("../utils/handleSendOtpChallenge.js"), () => ({
  handleSendOtpChallenge: mockHandleSendOtpChallenge,
}));

vi.mock(import("../utils/getAnalyticsSettings.js"), () => ({
  getAnalyticsSettings: mockGetAnalyticsSettings,
}));

const { introductionGetHandler, introductionPostHandler } =
  await import("./introduction.js");

describe("introduction handlers", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {};
    mockReply = {
      render: vi.fn().mockResolvedValue(undefined),
      redirect: vi.fn().mockReturnThis(),
    };

    mockGetAnalyticsSettings.mockReturnValue({
      enabled: true,
      taxonomyLevel1: "TODO",
      taxonomyLevel2: "TODO",
      taxonomyLevel3: "TODO",
      isPageDataSensitive: true,
      loggedInStatus: false,
      contentId: "TODO",
    });
  });

  describe("introductionGetHandler", () => {
    it("should render introduction template", async () => {
      const result = await introductionGetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockGetAnalyticsSettings).toHaveBeenCalledWith({
        contentId: "TODO",
      });
      expect(mockReply.analytics).toStrictEqual({
        enabled: true,
        taxonomyLevel1: "TODO",
        taxonomyLevel2: "TODO",
        taxonomyLevel3: "TODO",
        isPageDataSensitive: true,
        loggedInStatus: false,
        contentId: "TODO",
      });
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
      ).rejects.toThrowError();
    });
  });

  describe("introductionPostHandler", () => {
    it("should handle OTP challenge and redirect to verify email address page on success", async () => {
      mockHandleSendOtpChallenge.mockResolvedValue({ success: true });

      const result = await introductionPostHandler(
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

      const result = await introductionPostHandler(
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
