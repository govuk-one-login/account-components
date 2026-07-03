import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockSharedSendOtpHandler = vi.fn();
const mockStartJourneyAction = vi.fn();

vi.mock(import("../utils/sharedSendOtpHandler.js"), () => ({
  sharedSendOtpHandler: mockSharedSendOtpHandler,
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
    it("should delegate to sharedSendOtpHandler and return its result", async () => {
      mockSharedSendOtpHandler.mockResolvedValue(mockReply);

      const result = await introductionPostHandler(
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
