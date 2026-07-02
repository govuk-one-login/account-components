import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockSendOtpChallenge = vi.fn();

// @ts-expect-error
vi.mock(import("../../../utils/accountManagementApiClient.js"), () => ({
  AccountManagementApiClient: vi.fn().mockImplementation(function () {
    return {
      sendOtpChallenge: mockSendOtpChallenge,
    };
  }),
}));

const { sharedSendOtpHandler } = await import("./sharedSendOtpHandler.js");

describe("sharedSendOtpHandler", () => {
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
      redirect: vi.fn().mockReturnThis(),
      journeyStates: {
        "account-delete": {
          send: vi.fn(),
        },
      } as unknown as FastifyReply["journeyStates"],
    } as unknown as FastifyReply;
  });

  it("should send OTP challenge and redirect to verify email address page on success", async () => {
    mockSendOtpChallenge.mockResolvedValue({ success: true });

    const result = await sharedSendOtpHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockSendOtpChallenge).toHaveBeenCalledWith("test-public-sub");
    expect(mockReply.redirect).toHaveBeenCalledWith(
      "/reset-delete/check-email",
    );
    expect(result).toBe(mockReply);
  });

  it("should send lockedOutSecurityCodeEnteredTooManyTimes event and redirect when TooManyEmailCodesEntered", async () => {
    mockSendOtpChallenge.mockResolvedValue({
      success: false,
      error: "TooManyEmailCodesEntered",
    });

    const result = await sharedSendOtpHandler(
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

  it("should send lockedOutSecurityCodeRequestedTooManyTimes event and redirect when BlockedForEmailVerificationCodes", async () => {
    mockSendOtpChallenge.mockResolvedValue({
      success: false,
      error: "BlockedForEmailVerificationCodes",
    });

    const result = await sharedSendOtpHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(
      mockReply.journeyStates?.["account-delete"]?.send,
    ).toHaveBeenCalledWith({
      type: "lockedOutSecurityCodeRequestedTooManyTimes",
    });
    expect(mockReply.redirect).toHaveBeenCalledWith(
      "/reset-delete/security-code-requested-too-many-times",
    );
    expect(result).toBe(mockReply);
  });

  it("should throw when sendOtpChallenge returns an unhandled error", async () => {
    mockSendOtpChallenge.mockResolvedValue({
      success: false,
      error: "AccountManagementApiUnexpectedError",
    });

    await expect(
      sharedSendOtpHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      ),
    ).rejects.toThrow("AccountManagementApiUnexpectedError");
  });

  it("should throw if session claims are not available", async () => {
    delete mockRequest.session;

    await expect(
      sharedSendOtpHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      ),
    ).rejects.toThrow();
  });

  it("should throw if access token is not available", async () => {
    // @ts-expect-error
    delete mockRequest.session.claims.account_management_api_access_token;

    await expect(
      sharedSendOtpHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      ),
    ).rejects.toThrow();
  });

  it("should throw if account-delete journey state is not available", async () => {
    mockReply.journeyStates = {};

    await expect(
      sharedSendOtpHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      ),
    ).rejects.toThrow();
  });

  it("should throw if journey states are not available", async () => {
    delete mockReply.journeyStates;

    await expect(
      sharedSendOtpHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      ),
    ).rejects.toThrow();
  });
});
