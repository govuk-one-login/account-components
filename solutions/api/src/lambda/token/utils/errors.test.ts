import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TokenAppError } from "./errors.js";
import { errorManager } from "./errors.js";

describe("errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("throwError", () => {
    it("should throw an AppError with invalidRequest code", () => {
      expect(() =>
        errorManager.throwError("invalidRequest", "Test message"),
      ).toThrowError("Test message");
    });
  });

  describe("handleError", () => {
    it("should handle invalidRequest error correctly", async () => {
      const error: TokenAppError = new Error("Test error") as TokenAppError;
      error.code = "invalidRequest";

      const result = errorManager.handleError(error);

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({
          error: "invalid_request",
          error_description: "E4001",
        }),
      });
    });

    it("should return a generic error when there is a non AppError", () => {
      const error = new Error("Some random error");
      const result = errorManager.handleError(error);

      expect(result).toStrictEqual({
        statusCode: 500,
        body: JSON.stringify({
          error: "internal_server_error",
          error_description: "E500",
        }),
      });
    });
  });
});
