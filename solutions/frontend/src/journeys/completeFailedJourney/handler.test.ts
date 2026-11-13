import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";
import { Scope } from "../../../../commons/utils/commonTypes.js";

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
      log: {
        info: vi.fn(),
      } as unknown as FastifyRequest["log"],
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

  describe("passkeyCreate scope logging", () => {
    beforeEach(() => {
      mockCompleteJourney.mockResolvedValue(mockReply);
    });

    it("should log 'Skipped from set up passkey screen' when scope is passkeyCreate and error is UserAbortedJourney", async () => {
      mockRequest.query = {
        error_code: "1002",
        error_description: "UserAbortedJourney",
      };
      // @ts-expect-error
      mockRequest.session.claims = { scope: Scope.passkeyCreate };

      await completeFailedJourneyHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.info).toHaveBeenCalledWith(
        "Skipped from set up passkey screen",
      );
    });

    it("should log 'Backed out from set up passkey screen' when scope is passkeyCreate and error is UserBackedOutOfJourney", async () => {
      mockRequest.query = {
        error_code: "1003",
        error_description: "UserBackedOutOfJourney",
      };
      // @ts-expect-error
      mockRequest.session.claims = { scope: Scope.passkeyCreate };

      await completeFailedJourneyHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.info).toHaveBeenCalledWith(
        "Backed out from set up passkey screen",
      );
    });

    it("should not log passkey screen messages when scope is not passkeyCreate", async () => {
      mockRequest.query = {
        error_code: "1002",
        error_description: "UserAbortedJourney",
      };

      await completeFailedJourneyHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.info).not.toHaveBeenCalled();
    });
  });
});
