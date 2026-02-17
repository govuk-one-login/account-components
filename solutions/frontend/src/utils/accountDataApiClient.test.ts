import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AccountDataApiClient } from "./accountDataApiClient.js";
import type { APIGatewayProxyEvent } from "aws-lambda";

// @ts-expect-error
vi.mock(import("./jsonApiClient.js"), () => ({
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

describe("accountDataApiClient", () => {
  const mockAccessToken = "test-access-token";
  const mockEvent = {} as APIGatewayProxyEvent;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env["ACCOUNT_DATA_API_URL"] = "https://api.example.com";
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should throw error when ACCOUNT_DATA_API_URL is not set", () => {
      delete process.env["ACCOUNT_DATA_API_URL"];

      expect(
        () => new AccountDataApiClient(mockAccessToken, mockEvent),
      ).toThrowError("ACCOUNT_DATA_API_URL is not set");
    });

    it("should create instance with valid environment variable", () => {
      const client = new AccountDataApiClient(mockAccessToken, mockEvent);

      expect(client).toBeInstanceOf(AccountDataApiClient);
    });
  });

  describe("createPasskey", () => {
    it("should make correct API call", async () => {
      const client = new AccountDataApiClient(mockAccessToken, mockEvent);
      const publicSubjectId = "test-public-subject-id";
      const passkeyDetails = {
        credential: "test-credential",
        id: "test-id",
        aaguid: "test-aaguid",
        isAttested: true,
        signCount: 0,
        transports: ["usb", "nfc"],
        isBackUpEligible: true,
        isBackedUp: false,
        isResidentKey: true,
      };

      mockFetch.mockResolvedValueOnce(new Response());

      await client.createPasskey(publicSubjectId, passkeyDetails);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/accounts/test-public-subject-id/authenticators/passkeys",
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
          body: JSON.stringify(passkeyDetails),
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new AccountDataApiClient(mockAccessToken, mockEvent);

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.createPasskey("test-public-subject-id", {
        credential: "test-credential",
        id: "test-id",
        aaguid: "test-aaguid",
        isAttested: true,
        signCount: 0,
        transports: ["usb", "nfc"],
        isBackUpEligible: true,
        isBackedUp: false,
        isResidentKey: true,
      });

      expect(result).toStrictEqual({ success: false, error: "UnknownError" });
    });
  });
});
