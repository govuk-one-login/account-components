import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockDeleteAccount = vi.fn();
const mockCompleteJourney = vi.fn();

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

vi.mock(import("../../utils/completeJourney.js"), () => ({
  completeJourney: mockCompleteJourney,
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
          account_management_api_access_token: "test-token",
          email: "test@example.com",
          redirect_uri: "https://example.com/callback",
          state: "test-state",
        },
      },
    };
    mockReply = {
      render: vi.fn().mockResolvedValue(undefined),
    } as unknown as FastifyReply;
  });

  describe("confirmGetHandler", () => {
    it("should render confirm template", async () => {
      process.env["CONTACT_URL"] = "https://example.com/contact";

      const result = await confirmGetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/confirm.njk",
        undefined,
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
        {},
        true,
      );
      expect(result).toBe(mockReply);
    });

    it("should throw error when deleteAccount fails", async () => {
      mockDeleteAccount.mockResolvedValue({
        success: false,
        error: "Failed to delete account",
      });

      await expect(
        confirmPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrowError("Failed to delete account");

      expect(mockDeleteAccount).toHaveBeenCalledWith("test@example.com");
      expect(mockCompleteJourney).not.toHaveBeenCalled();
    });

    it("should throw error when session claims are missing", async () => {
      delete mockRequest.session;

      await expect(
        confirmPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();

      expect(mockDeleteAccount).not.toHaveBeenCalled();
      expect(mockCompleteJourney).not.toHaveBeenCalled();
    });

    it("should throw error when access token is missing", async () => {
      // @ts-expect-error
      delete mockRequest.session.claims.account_management_api_access_token;

      await expect(
        confirmPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();

      expect(mockDeleteAccount).not.toHaveBeenCalled();
      expect(mockCompleteJourney).not.toHaveBeenCalled();
    });
  });
});
