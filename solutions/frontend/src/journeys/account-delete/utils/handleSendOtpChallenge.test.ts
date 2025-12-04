import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

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
          access_token: "test-token",
          email: "test@example.com",
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

    expect(mockSendOtpChallenge).toHaveBeenCalledWith("test@example.com");
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
    ).rejects.toThrow();
  });

  it.each([
    "RequestIsMissingParameters",
    "BlockedForEmailVerificationCodes",
    "TooManyEmailCodesEntered",
    "InvalidPrincipalInRequest",
    "AccountManagementApiUnexpectedError",
    "ErrorParsingResponseBody",
    "ErrorParsingResponseBodyJson",
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

      expect(mockSendOtpChallenge).toHaveBeenCalledWith("test@example.com");
      expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        "https://example.com/callback",
        { description: "E1000", type: "access_denied" },
        "test-state",
      );
      expect(result).toStrictEqual({ success: false });
    },
  );
});
