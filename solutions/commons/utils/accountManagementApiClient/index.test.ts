import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AccountManagementApiClient } from "./index.js";
import type { APIGatewayProxyEvent } from "aws-lambda";

// @ts-expect-error
vi.mock(import("../jsonApiClient/index.js"), () => ({
  JsonApiClient: class MockJsonApiClient {
    serviceName: string;
    commonHeaders: Record<string, string>;

    constructor(serviceName: string) {
      this.serviceName = serviceName;
      this.commonHeaders = {
        "di-persistent-session-id": "test-persistent-session-id",
        "session-id": "test-session-id",
        "client-session-id": "test-client-session-id",
        "user-language": "en",
        "x-forwarded-for": "192.168.1.1",
        "txma-audit-encoded": "test-txma-audit",
      };
    }

    logOnError = vi.fn((_methodName: string, fn: () => Promise<any>) => fn());

    static processResponse = vi.fn();
    static undefinedSchema = {};
    static unknownError = { success: false, error: "UnknownError" };
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("accountManagementApiClient", () => {
  const mockAccessToken = "test-access-token";
  const mockEvent = {} as APIGatewayProxyEvent;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env["ACCOUNT_MANAGEMENT_API_URL"] = "https://api.example.com";
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should throw error when ACCOUNT_MANAGEMENT_API_URL is not set", () => {
      delete process.env["ACCOUNT_MANAGEMENT_API_URL"];

      expect(
        () => new AccountManagementApiClient(mockAccessToken, mockEvent),
      ).toThrowError("ACCOUNT_MANAGEMENT_API_URL is not set");
    });

    it("should create instance with valid environment variable", () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);

      expect(client).toBeInstanceOf(AccountManagementApiClient);
    });
  });

  describe("sendOtpChallenge", () => {
    it("should make correct API call", async () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);
      const email = "test@example.com";

      mockFetch.mockResolvedValueOnce(new Response());

      await client.sendOtpChallenge(email);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/send-otp-challenge",
        {
          method: "POST",
          headers: {
            "di-persistent-session-id": "test-persistent-session-id",
            "session-id": "test-session-id",
            "client-session-id": "test-client-session-id",
            "user-language": "en",
            "x-forwarded-for": "192.168.1.1",
            "txma-audit-encoded": "test-txma-audit",
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          },
          body: JSON.stringify({
            email,
            mfaMethodType: "EMAIL",
          }),
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.sendOtpChallenge("test@example.com");

      expect(result).toStrictEqual({ success: false, error: "UnknownError" });
    });
  });

  describe("verifyOtpChallenge", () => {
    it("should make correct API call", async () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);
      const email = "test@example.com";
      const otp = "123456";

      mockFetch.mockResolvedValueOnce(new Response());

      await client.verifyOtpChallenge(email, otp);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/verify-otp-challenge",
        {
          method: "POST",
          headers: {
            "di-persistent-session-id": "test-persistent-session-id",
            "session-id": "test-session-id",
            "client-session-id": "test-client-session-id",
            "user-language": "en",
            "x-forwarded-for": "192.168.1.1",
            "txma-audit-encoded": "test-txma-audit",
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          },
          body: JSON.stringify({
            email,
            mfaMethodType: "EMAIL",
            otp,
          }),
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.verifyOtpChallenge(
        "test@example.com",
        "123456",
      );

      expect(result).toStrictEqual({ success: false, error: "UnknownError" });
    });
  });
});
