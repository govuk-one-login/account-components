import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AccountManagementApiClient } from "./index.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

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
    it("should make POST request with correct parameters", async () => {
      const mockResponse = { ok: true };
      mockFetch.mockResolvedValue(mockResponse);

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
      expect(result).toBe(mockResponse);
    });
  });

  describe("verifyOtpChallenge", () => {
    it("should make POST request with correct parameters including OTP", async () => {
      const mockResponse = { ok: true };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new AccountManagementApiClient("test-token");
      const result = await client.verifyOtpChallenge(
        "test@example.com",
        "123456",
      );

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
            otp: "123456",
          }),
        },
      );
      expect(result).toBe(mockResponse);
    });
  });
});
