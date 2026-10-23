import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AccountManagementApiClient } from "./accountManagementApiClient.js";
import type { APIGatewayProxyEvent } from "aws-lambda";

vi.mock(import("../../../commons/utils/getEnvironment/index.js"), () => ({
  getEnvironment: vi.fn().mockReturnValue("local"),
}));

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
    static unknownError = {
      success: false,
      error: "UnknownError",
      rawResponse: undefined,
    };
  },
}));

describe("accountManagementApiClient", () => {
  const mockAccessToken = "test-access-token";
  const mockEvent = {} as APIGatewayProxyEvent;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env["ACCOUNT_MANAGEMENT_API_URL"] = "https://api.example.com";
    vi.clearAllMocks();
    const { getEnvironment } =
      await import("../../../commons/utils/getEnvironment/index.js");
    vi.mocked(getEnvironment).mockReturnValue("local");
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should throw error when ACCOUNT_MANAGEMENT_API_URL is not set", () => {
      delete process.env["ACCOUNT_MANAGEMENT_API_URL"];

      expect(
        () => new AccountManagementApiClient(mockAccessToken, mockEvent),
      ).toThrow("ACCOUNT_MANAGEMENT_API_URL is not set");
    });

    it("should create instance with valid environment variable", () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);

      expect(client).toBeInstanceOf(AccountManagementApiClient);
    });

    it("should set Authorization header when in local environment and token provided", async () => {
      const { getEnvironment } =
        await import("../../../commons/utils/getEnvironment/index.js");
      vi.mocked(getEnvironment).mockReturnValue("local");

      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);

      // @ts-expect-error
      expect(client.commonHeaders.Authorization).toBe(
        `Bearer ${mockAccessToken}`,
      );
    });

    it("should not set Authorization header when token is not provided", async () => {
      const { getEnvironment } =
        await import("../../../commons/utils/getEnvironment/index.js");
      vi.mocked(getEnvironment).mockReturnValue("local");

      const client = new AccountManagementApiClient(undefined, mockEvent);

      // @ts-expect-error
      expect(client.commonHeaders.Authorization).toBeUndefined();
    });

    it.each(["staging", "production"])(
      "should not set Authorization header in %s environment",
      async (env) => {
        const { getEnvironment } =
          await import("../../../commons/utils/getEnvironment/index.js");
        // @ts-expect-error
        vi.mocked(getEnvironment).mockReturnValue(env);

        const client = new AccountManagementApiClient(
          mockAccessToken,
          mockEvent,
        );

        // @ts-expect-error
        expect(client.commonHeaders.Authorization).toBeUndefined();
      },
    );
  });

  describe("sendOtpChallenge", () => {
    it("should make correct API call", async () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);
      const publicSubjectId = "test-public-subject-id";

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.sendOtpChallenge(publicSubjectId);

      expect(mockThisFetch).toHaveBeenCalledWith(
        "https://api.example.com/send-otp-challenge/test-public-subject-id",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          },
          body: JSON.stringify({
            mfaMethodType: "EMAIL",
          }),
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);
      const error = new Error("Network error");

      mockThisFetch.mockRejectedValueOnce(error);

      const result = await client.sendOtpChallenge("test-public-subject-id");

      expect(result).toStrictEqual({
        success: false,
        error: "UnknownError",
        rawResponse: undefined,
        errorDetails: error,
      });
    });
  });

  describe("authenticate", () => {
    it("should make correct API call", async () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);
      const email = "test@example.com";
      const password = "password123"; // pragma: allowlist secret

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.authenticate(email, password);

      expect(mockThisFetch).toHaveBeenCalledWith(
        "https://api.example.com/authenticate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);
      const error = new Error("Network error");

      mockThisFetch.mockRejectedValueOnce(error);

      const result = await client.authenticate(
        "test@example.com",
        "password123",
      );

      expect(result).toStrictEqual({
        success: false,
        error: "UnknownError",
        rawResponse: undefined,
        errorDetails: error,
      });
    });
  });

  describe("deleteAccount", () => {
    it("should make correct API call", async () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);
      const adapiAccessToken = "test-adapi-access-token";
      const email = "test@example.com";

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.deleteAccount(adapiAccessToken, email);

      expect(mockThisFetch).toHaveBeenCalledWith(
        "https://api.example.com/delete-account",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
            "X-ADAPI-AccessToken": adapiAccessToken,
          },
          body: JSON.stringify({
            email,
          }),
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);
      const error = new Error("Network error");

      mockThisFetch.mockRejectedValueOnce(error);

      const result = await client.deleteAccount(
        "test-adapi-access-token",
        "test@example.com",
      );

      expect(result).toStrictEqual({
        success: false,
        error: "UnknownError",
        rawResponse: undefined,
        errorDetails: error,
      });
    });
  });

  describe("verifyOtpChallenge", () => {
    it("should make correct API call", async () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);
      const publicSubjectId = "test-public-subject-id";
      const otp = "123456";

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.verifyOtpChallenge(publicSubjectId, otp);

      expect(mockThisFetch).toHaveBeenCalledWith(
        "https://api.example.com/verify-otp-challenge/test-public-subject-id",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          },
          body: JSON.stringify({
            otp,
            mfaMethodType: "EMAIL",
          }),
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new AccountManagementApiClient(mockAccessToken, mockEvent);
      const error = new Error("Network error");

      mockThisFetch.mockRejectedValueOnce(error);

      const result = await client.verifyOtpChallenge(
        "test-public-subject-id",
        "123456",
      );

      expect(result).toStrictEqual({
        success: false,
        error: "UnknownError",
        rawResponse: undefined,
        errorDetails: error,
      });
    });
  });
});
