import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AccountInterventionsServiceApiClient } from "./accountInterventionsServiceApiClient.js";
import type { APIGatewayProxyEvent } from "aws-lambda";

const mockGetEnvironment = vi.fn();

vi.mock(import("../../../commons/utils/getEnvironment/index.js"), () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  getEnvironment: () => mockGetEnvironment(),
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

describe("accountInterventionsServiceApiClient", () => {
  const mockAccessToken = "test-access-token";
  const mockEvent = {} as APIGatewayProxyEvent;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env["ACCOUNT_INTERVENTIONS_SERVICE_API_URL"] =
      "https://api.example.com";
    mockGetEnvironment.mockReturnValue("local");
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should throw error when ACCOUNT_INTERVENTIONS_SERVICE_API_URL is not set", () => {
      delete process.env["ACCOUNT_INTERVENTIONS_SERVICE_API_URL"];

      expect(
        () =>
          new AccountInterventionsServiceApiClient(mockAccessToken, mockEvent),
      ).toThrow("ACCOUNT_INTERVENTIONS_SERVICE_API_URL is not set");
    });

    it("should create instance with valid environment variable", () => {
      const client = new AccountInterventionsServiceApiClient(
        mockAccessToken,
        mockEvent,
      );

      expect(client).toBeInstanceOf(AccountInterventionsServiceApiClient);
    });
  });

  describe("getUserAisStatus", () => {
    it.each(["local", "dev", "build"])(
      "should include Authorization header in %s environment",
      async (env) => {
        mockGetEnvironment.mockReturnValue(env);
        const client = new AccountInterventionsServiceApiClient(
          mockAccessToken,
          mockEvent,
        );

        mockThisFetch.mockResolvedValueOnce(new Response());

        await client.getUserAisStatus("test-common-subject-id");

        expect(mockThisFetch).toHaveBeenCalledWith(
          "https://api.example.com/ais/test-common-subject-id",
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${mockAccessToken}`,
            },
          },
        );
      },
    );

    it.each(["staging", "integration", "production"])(
      "should not include Authorization header in %s environment",
      async (env) => {
        mockGetEnvironment.mockReturnValue(env);
        const client = new AccountInterventionsServiceApiClient(
          mockAccessToken,
          mockEvent,
        );

        mockThisFetch.mockResolvedValueOnce(new Response());

        await client.getUserAisStatus("test-common-subject-id");

        expect(mockThisFetch).toHaveBeenCalledWith(
          "https://api.example.com/ais/test-common-subject-id",
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      },
    );

    it("should not include Authorization header when accessToken is not provided", async () => {
      const client = new AccountInterventionsServiceApiClient(
        undefined,
        mockEvent,
      );

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.getUserAisStatus("test-common-subject-id");

      expect(mockThisFetch).toHaveBeenCalledWith(
        "https://api.example.com/ais/test-common-subject-id",
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new AccountInterventionsServiceApiClient(
        mockAccessToken,
        mockEvent,
      );
      const error = new Error("Network error");

      mockThisFetch.mockRejectedValueOnce(error);

      const result = await client.getUserAisStatus("test-common-subject-id");

      expect(result).toStrictEqual({
        success: false,
        error: "UnknownError",
        rawResponse: undefined,
        errorDetails: error,
      });
    });
  });
});
