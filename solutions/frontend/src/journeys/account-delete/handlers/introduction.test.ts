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

const { introductionGetHandler, introductionPostHandler } = await import(
  "./introduction.js"
);

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
  });

  describe("introductionGetHandler", () => {
    it("should render introduction template", async () => {
      const result = await introductionGetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

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
      ).rejects.toThrow();
    });
  });

  describe("introductionPostHandler", () => {
    it("should redirect to verify email address page", async () => {
      const result = await introductionPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.redirect).toHaveBeenCalledWith(
        "/delete-account/verify-email-address",
      );
      expect(result).toBe(mockReply);
    });
  });
});
