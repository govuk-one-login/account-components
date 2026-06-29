import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockCompleteJourney = vi.fn();
const mockCompleteAllJourneyActionsUnsuccessfully = vi.fn();

vi.mock(import("../utils/completeJourney.js"), () => ({
  completeJourney: mockCompleteJourney,
}));

vi.mock(import("../utils/journeyActions.js"), async (importOriginal) => ({
  ...(await importOriginal()),
  completeAllJourneyActionsUnsuccessfully:
    mockCompleteAllJourneyActionsUnsuccessfully,
}));

const { completeFailedJourneyHandler } = await import("./handler.js");

describe("completeFailedJourneyHandler", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      session: {
        journeyActions: [{ action: "temp-account-delete-action" }],
      },
      method: "GET",
    } as unknown as Partial<FastifyRequest>;
    mockReply = {};
  });

  describe("get request", () => {
    it("should parse query params and call completeJourney", async () => {
      mockRequest.query = {
        error_code: "1001",
        error_description: "UserSignedOut",
      };
      mockCompleteJourney.mockResolvedValue(mockReply);

      const result = await completeFailedJourneyHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockCompleteAllJourneyActionsUnsuccessfully).toHaveBeenCalledWith(
        {
          code: 1001,
          description: "UserSignedOut",
          destroySession: true,
        },
        mockRequest,
        mockReply,
      );
      expect(mockCompleteJourney).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        false,
      );
      expect(result).toBe(mockReply);
    });

    it("should handle numeric string error codes", async () => {
      mockRequest.query = {
        error_code: "1002",
        error_description: "UserAbortedJourney",
      };
      mockCompleteJourney.mockResolvedValue(mockReply);

      await completeFailedJourneyHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockCompleteAllJourneyActionsUnsuccessfully).toHaveBeenCalledWith(
        {
          code: 1002,
          description: "UserAbortedJourney",
          destroySession: false,
        },
        mockRequest,
        mockReply,
      );
      expect(mockCompleteJourney).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
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
      ).rejects.toThrow();
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
      ).rejects.toThrow();
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
      ).rejects.toThrow();
    });

    it("should throw when error code and description do not match a known error", async () => {
      mockRequest.query = {
        error_code: "9999",
        error_description: "UnknownError",
      };

      await expect(
        completeFailedJourneyHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow("Error not found");
    });
  });

  describe("post request", () => {
    beforeEach(() => {
      mockRequest = {
        session: {
          journeyActions: [{ action: "temp-account-delete-action" }],
        },
        method: "POST",
      } as unknown as Partial<FastifyRequest>;
    });

    it("should parse body params and call completeJourney", async () => {
      mockRequest.body = {
        error_code: "1001",
        error_description: "UserSignedOut",
      };
      mockCompleteJourney.mockResolvedValue(mockReply);

      const result = await completeFailedJourneyHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockCompleteAllJourneyActionsUnsuccessfully).toHaveBeenCalledWith(
        {
          code: 1001,
          description: "UserSignedOut",
          destroySession: true,
        },
        mockRequest,
        mockReply,
      );
      expect(mockCompleteJourney).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
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
      ).rejects.toThrow();
    });
  });
});
