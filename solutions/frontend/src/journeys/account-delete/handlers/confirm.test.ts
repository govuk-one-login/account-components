import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockDeleteAccount = vi.fn();
const mockRedirectToClientRedirectUri = vi.fn();
const mockCompleteJourney = vi.fn();
const mockGetAnalyticsSettings = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../../../commons/utils/accountManagementApiClient/index.js"),
  () => ({
    AccountManagementApiClient: vi.fn().mockImplementation(function () {
      return {
        deleteAccount: mockDeleteAccount,
      };
    }),
  }),
);

vi.mock(import("../../../utils/redirectToClientRedirectUri.js"), () => ({
  redirectToClientRedirectUri: mockRedirectToClientRedirectUri,
}));

vi.mock(import("../../utils/completeJourney.js"), () => ({
  completeJourney: mockCompleteJourney,
}));

vi.mock(import("../utils/getAnalyticsSettings.js"), () => ({
  getAnalyticsSettings: mockGetAnalyticsSettings,
}));

const { confirmGetHandler, confirmPostHandler } = await import("./confirm.js");

describe("confirm handlers", () => {
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
      journeyStates: {
        "account-delete": {
          send: vi.fn(),
        },
      } as unknown as FastifyReply["journeyStates"],
    } as unknown as FastifyReply;

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

  describe("confirmGetHandler", () => {
    it("should render confirm template", async () => {
      const result = await confirmGetHandler(
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
        "journeys/account-delete/templates/confirm.njk",
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if reply.render is not available", async () => {
      delete mockReply.render;

      await expect(
        confirmGetHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });
  });

  describe("confirmPostHandler", () => {
    it("should delete account and complete journey when successful", async () => {
      mockDeleteAccount.mockResolvedValue({ success: true });
      mockCompleteJourney.mockResolvedValue(mockReply);

      const result = await confirmPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockDeleteAccount).toHaveBeenCalledWith("test@example.com");
      expect(mockCompleteJourney).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        mockRequest.session?.claims,
        [
          {
            accountDeleted: true,
          },
        ],
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if journey states are not available", async () => {
      delete mockReply.journeyStates;

      await expect(
        confirmPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });

    it("should throw if account-delete journey state is not available", async () => {
      mockReply.journeyStates = {};

      await expect(
        confirmPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });

    it.each([
      "RequestIsMissingParameters",
      "AccountDoesNotExist",
      "ErrorValidatingResponseBody",
      "ErrorParsingResponseBodyJson",
      "ErrorValidatingErrorResponseBody",
      "ErrorParsingErrorResponseBodyJson",
      "UnknownErrorResponse",
      "UnknownError",
    ] as const)(
      "should redirect to client redirect URI when deleteAccount fails with %s",
      async (errorType) => {
        mockDeleteAccount.mockResolvedValue({
          success: false,
          error: errorType,
        });
        mockRedirectToClientRedirectUri.mockResolvedValue(mockReply);

        const result = await confirmPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockDeleteAccount).toHaveBeenCalledWith("test@example.com");
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
