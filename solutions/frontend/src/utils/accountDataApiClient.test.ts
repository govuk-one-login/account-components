import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AccountDataApiClient } from "./accountDataApiClient.js";
import type { APIGatewayProxyEvent } from "aws-lambda";

const mockThisFetch = vi.fn();

// @ts-expect-error
vi.mock(import("./jsonApiClient.js"), () => ({
  JsonApiClient: class MockJsonApiClient {
    serviceName: string;
    fetch = mockThisFetch;

    constructor(serviceName: string) {
      this.serviceName = serviceName;
    }

    logOnError = vi.fn((_methodName: string, fn: () => Promise<any>) => fn());

    static processResponse = vi.fn();
    static undefinedSchema = {};
    static unknownError = { success: false, error: "UnknownError" };
  },
}));

vi.mock(import("../../../commons/utils/constants.js"), async () => {
  const v = await import("valibot");
  return {
    passkeyDetailsSchema: v.object({
      credential: v.string(),
      id: v.string(),
      aaguid: v.string(),
      isAttested: v.boolean(),
      signCount: v.number(),
      transports: v.array(v.string()),
      isBackUpEligible: v.boolean(),
      isBackedUp: v.boolean(),
      isResidentKey: v.boolean(),
    }),
  };
});

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
      ).toThrow("ACCOUNT_DATA_API_URL is not set");
    });

    it("should create instance with valid environment variable", () => {
      const client = new AccountDataApiClient(mockAccessToken, mockEvent);

      expect(client).toBeInstanceOf(AccountDataApiClient);
    });
  });

  describe("getPasskeys", () => {
    it("should make correct API call", async () => {
      const client = new AccountDataApiClient(mockAccessToken, mockEvent);
      const publicSubjectId = "test-public-subject-id";

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.getPasskeys(publicSubjectId);

      expect(mockThisFetch).toHaveBeenCalledWith(
        "https://api.example.com/accounts/test-public-subject-id/authenticators/passkeys",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          },
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new AccountDataApiClient(mockAccessToken, mockEvent);

      mockThisFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.getPasskeys("test-public-subject-id");

      expect(result).toStrictEqual({ success: false, error: "UnknownError" });
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

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.createPasskey(publicSubjectId, passkeyDetails);

      expect(mockThisFetch).toHaveBeenCalledWith(
        "https://api.example.com/accounts/test-public-subject-id/authenticators/passkeys",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          },
          body: JSON.stringify(passkeyDetails),
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new AccountDataApiClient(mockAccessToken, mockEvent);

      mockThisFetch.mockRejectedValueOnce(new Error("Network error"));

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
