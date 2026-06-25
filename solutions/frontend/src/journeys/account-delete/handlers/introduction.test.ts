import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockSendOtpChallenge = vi.fn();
const mockStartJourneyAction = vi.fn();

// @ts-expect-error
vi.mock(import("../../../utils/accountManagementApiClient.js"), () => ({
  AccountManagementApiClient: vi.fn().mockImplementation(function () {
    return {
      sendOtpChallenge: mockSendOtpChallenge,
    };
  }),
}));

vi.mock(import("../../utils/journeyActions.js"), async (importOriginal) => ({
  ...(await importOriginal()),
  startJourneyAction: mockStartJourneyAction,
}));

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
      journeyStates: {
        "account-delete": {
          send: vi.fn(),
        },
      } as unknown as FastifyReply["journeyStates"],
    } as unknown as FastifyReply;
  });

  describe("introductionGetHandler", () => {
    it("should render introduction template", async () => {
      const result = await introductionGetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockStartJourneyAction).toHaveBeenCalledWith(
        { action: "temp-account-delete-action" },
        mockRequest,
        mockReply,
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
      ).rejects.toThrow();
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
        "/reset-delete/check-email",
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
      ).rejects.toThrow();
    });

    it("should throw if access token is not available", async () => {
      // @ts-expect-error
      delete mockRequest.session.claims.account_management_api_access_token;

      await expect(
        introductionPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow();
    });

    it("should throw if journey states are not available", async () => {
      delete mockReply.journeyStates;

      await expect(
        introductionPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow();
    });

    it("should send lockedOutSecurityCodeEnteredTooManyTimes event and redirect when TooManyEmailCodesEntered", async () => {
      mockSendOtpChallenge.mockResolvedValue({
        success: false,
        error: "TooManyEmailCodesEntered",
      });

      const result = await introductionPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(
        mockReply.journeyStates?.["account-delete"]?.send,
      ).toHaveBeenCalledWith({
        type: "lockedOutSecurityCodeEnteredTooManyTimes",
      });
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "/reset-delete/security-code-entered-exceeded",
      );
      expect(result).toBe(mockReply);
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
      ).rejects.toThrow("BlockedForEmailVerificationCodes");
    });
  });
});
