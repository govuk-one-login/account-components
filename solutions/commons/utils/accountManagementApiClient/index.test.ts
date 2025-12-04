import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AccountManagementApiClient } from "./index.js";
import { logger } from "../logger/index.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// @ts-expect-error
vi.mock(import("../logger/index.js"), () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("accountManagementApiClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env["ACCOUNT_MANAGEMENT_API_URL"] = "https://api.example.com";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should create instance with access token", () => {
      const client = new AccountManagementApiClient("test-token");

      expect(client).toBeInstanceOf(AccountManagementApiClient);
    });

    it("should throw if ACCOUNT_MANAGEMENT_API_URL is not set", () => {
      delete process.env["ACCOUNT_MANAGEMENT_API_URL"];

      expect(() => new AccountManagementApiClient("test-token")).toThrow(
        "ACCOUNT_MANAGEMENT_API_URL is not set",
      );
    });
  });

  describe("sendOtpChallenge", () => {
    it("should return success object on successful response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
      });

      const client = new AccountManagementApiClient("test-token");
      const result = await client.sendOtpChallenge("test@example.com");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/send-otp-challenge",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          },
          body: JSON.stringify({
            email: "test@example.com",
            mfaMethodType: "EMAIL",
          }),
        },
      );
      expect(result).toStrictEqual({ success: true, result: undefined });
    });

    it("should return error object for known errors and log the error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ code: 1001, message: "Missing parameters" }),
      });

      const client = new AccountManagementApiClient("test-token");
      const result = await client.sendOtpChallenge("test@example.com");

      expect(result).toStrictEqual({
        success: false,
        error: "RequestIsMissingParameters",
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.error).toHaveBeenCalledWith({
        message: "Account management API error",
        error: "RequestIsMissingParameters",
        method: "sendOtpChallenge",
      });
    });

    it("should return UnknownErrorResponse for unknown error codes", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ code: 9999, message: "Unknown error" }),
      });

      const client = new AccountManagementApiClient("test-token");
      const result = await client.sendOtpChallenge("test@example.com");

      expect(result).toStrictEqual({
        success: false,
        error: "UnknownErrorResponse",
      });
    });

    it("should return UnknownError when fetch throws an exception", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const client = new AccountManagementApiClient("test-token");
      const result = await client.sendOtpChallenge("test@example.com");

      expect(result).toStrictEqual({
        success: false,
        error: "UnknownError",
      });
    });
  });

  describe("verifyOtpChallenge", () => {
    it("should return success object on successful verification", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
      });

      const client = new AccountManagementApiClient("test-token");
      const result = await client.verifyOtpChallenge(
        "test@example.com",
        "123456",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/verify-otp-challenge",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          },
          body: JSON.stringify({
            email: "test@example.com",
            mfaMethodType: "EMAIL",
            otp: "123456",
          }),
        },
      );
      expect(result).toStrictEqual({ success: true, result: undefined });
    });

    it("should return error object for invalid OTP and log the error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ code: 1020, message: "Invalid OTP" }),
      });

      const client = new AccountManagementApiClient("test-token");
      const result = await client.verifyOtpChallenge(
        "test@example.com",
        "wrong-otp",
      );

      expect(result).toStrictEqual({ success: false, error: "InvalidOTPCode" });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.error).toHaveBeenCalledWith({
        message: "Account management API error",
        error: "InvalidOTPCode",
        method: "verifyOtpChallenge",
      });
    });

    it("should return UnknownErrorResponse for unknown error codes", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ code: 8888, message: "Unknown error" }),
      });

      const client = new AccountManagementApiClient("test-token");
      const result = await client.verifyOtpChallenge(
        "test@example.com",
        "123456",
      );

      expect(result).toStrictEqual({
        success: false,
        error: "UnknownErrorResponse",
      });
    });

    it("should return UnknownError when fetch throws an exception", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const client = new AccountManagementApiClient("test-token");
      const result = await client.verifyOtpChallenge(
        "test@example.com",
        "123456",
      );

      expect(result).toStrictEqual({
        success: false,
        error: "UnknownError",
      });
    });
  });
});
