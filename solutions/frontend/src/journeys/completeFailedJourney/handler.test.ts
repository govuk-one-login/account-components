import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockCompleteJourney = vi.fn();

vi.mock(import("../utils/completeJourney.js"), () => ({
  completeJourney: mockCompleteJourney,
}));

const { completeFailedJourneyHandler } = await import("./handler.js");

describe("completeFailedJourneyHandler", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {};
    mockReply = {};
  });

  describe("gET request", () => {
    beforeEach(() => {
      mockRequest = { method: "GET" };
    });

    it("should parse query params and call completeJourney", async () => {
      mockRequest.query = {
        error_code: "123",
        error_description: "Test error",
      };
      mockCompleteJourney.mockResolvedValue(mockReply);

      const result = await completeFailedJourneyHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockCompleteJourney).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        { code: 123, description: "Test error" },
        false,
      );
      expect(result).toBe(mockReply);
    });

    it("should handle numeric string error codes", async () => {
      mockRequest.query = {
        error_code: "456",
        error_description: "Another error",
      };
      mockCompleteJourney.mockResolvedValue(mockReply);

      await completeFailedJourneyHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockCompleteJourney).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        { code: 456, description: "Another error" },
        false,
      );
    });

    it("should throw on invalid error_code", async () => {
      mockRequest.query = {
        error_code: "invalid",
        error_description: "Test error",
      };

      await expect(
        completeFailedJourneyHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });

    it("should throw on error_code less than 1", async () => {
      mockRequest.query = {
        error_code: "0",
        error_description: "Test error",
      };

      await expect(
        completeFailedJourneyHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });

    it("should throw on empty error_description", async () => {
      mockRequest.query = {
        error_code: "123",
        error_description: "",
      };

      await expect(
        completeFailedJourneyHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });
  });

  describe("pOST request", () => {
    beforeEach(() => {
      mockRequest = { method: "POST" };
    });

    it("should parse body params and call completeJourney", async () => {
      mockRequest.body = {
        error_code: "789",
        error_description: "Post error",
      };
      mockCompleteJourney.mockResolvedValue(mockReply);

      const result = await completeFailedJourneyHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockCompleteJourney).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        { code: 789, description: "Post error" },
        false,
      );
      expect(result).toBe(mockReply);
    });

    it("should throw on invalid body params", async () => {
      mockRequest.body = {
        error_code: "123",
      };

      await expect(
        completeFailedJourneyHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });
  });
});
