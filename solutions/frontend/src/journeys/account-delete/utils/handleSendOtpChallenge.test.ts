import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockSendOtpChallenge = vi.fn();
const mockCompleteJourney = vi.fn();

vi.mock(import("../../utils/completeJourney.js"), () => ({
  completeJourney: mockCompleteJourney,
}));

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

const { handleSendOtpChallenge } = await import("./handleSendOtpChallenge.js");

describe("handleSendOtpChallenge", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      session: {
        // @ts-expect-error
        claims: {
          account_management_api_access_token: "test-token",
          public_sub: "test-public_sub-123",
          redirect_uri: "https://example.com/callback",
          state: "test-state",
        },
      },
    };
    mockReply = {};
  });

  it("should return success when OTP challenge succeeds", async () => {
    mockSendOtpChallenge.mockResolvedValue({ success: true });

    const result = await handleSendOtpChallenge(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockSendOtpChallenge).toHaveBeenCalledWith("test-public_sub-123");
    expect(result).toStrictEqual({ success: true });
  });

  it("should throw if session claims are not available", async () => {
    delete mockRequest.session;

    await expect(
      handleSendOtpChallenge(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      ),
      // eslint-disable-next-line vitest/require-to-throw-message
    ).rejects.toThrowError();
  });

  it.each([
    "RequestIsMissingParameters",
    "BlockedForEmailVerificationCodes",
    "TooManyEmailCodesEntered",
    "InvalidPrincipalInRequest",
    "AccountManagementApiUnexpectedError",
    "ErrorValidatingResponseBody",
    "ErrorParsingResponseBodyJson",
    "ErrorValidatingErrorResponseBody",
    "ErrorParsingErrorResponseBodyJson",
    "UnknownErrorResponse",
    "UnknownError",
  ] as const)(
    "should redirect to client redirect URI when sendOtpChallenge fails with %s",
    async (errorType) => {
      mockSendOtpChallenge.mockResolvedValue({
        success: false,
        error: errorType,
      });

      const result = await handleSendOtpChallenge(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockSendOtpChallenge).toHaveBeenCalledWith("test-public_sub-123");
      expect(mockCompleteJourney).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        { code: 1000, description: "TempErrorTODORemoveLater" },
        false,
      );
      expect(result).toStrictEqual({ success: false });
    },
  );
});
