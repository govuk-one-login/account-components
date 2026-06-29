import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const { lockedOutSecurityCodeRequestedTooManyTimesGetHandler } =
  await import("./lockedOutSecurityCodeRequestedTooManyTimes.js");

describe("lockedOutSecurityCodeRequestedTooManyTimes handlers", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {};
    mockReply = {
      render: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe("getHandler", () => {
    it("should render lockedOutSecurityCodeRequestedTooManyTimes template", async () => {
      const result = await lockedOutSecurityCodeRequestedTooManyTimesGetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/lockedOutSecurityCodeRequestedTooManyTimes.njk",
        undefined,
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if reply.render is not available", async () => {
      delete mockReply.render;

      await expect(
        lockedOutSecurityCodeRequestedTooManyTimesGetHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow();
    });
  });
});
