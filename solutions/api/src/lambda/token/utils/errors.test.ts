import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AppError } from "./errors.js";
import { throwError, handleError } from "./errors.js";

describe("errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("throwError", () => {
    it("should throw an AppError with invalidRequest code", () => {
      expect(() => throwError("invalidRequest", "Test message")).toThrow(
        "Test message",
      );
    });
  });

  describe("handleError", () => {
    it("should handle invalidRequest error correctly", async () => {
      const error: AppError = new Error("Test error") as AppError;
      error.code = "invalidRequest";

      const result = handleError(error);

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({
          error: "invalid_request",
          error_description: "E4001",
        }),
      });
    });
  });
});
