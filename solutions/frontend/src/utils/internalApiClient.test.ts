import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InternalApiClient } from "./internalApiClient.js";
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
    static unknownError = {
      success: false,
      error: "UnknownError",
      rawResponse: undefined,
    };
  },
}));

// @ts-expect-error
vi.mock(import("../../../commons/utils/constants.js"), () => ({
  Source: { "account-delete": "account-delete" },
  LockoutType: {
    TooManyOTPsRequested: "TooManyOTPsRequested",
    TooManyIncorrectOTPsEntered: "TooManyIncorrectOTPsEntered",
    TooManyIncorrectPasswordsEntered: "TooManyIncorrectPasswordsEntered", // pragma: allowlist secret
  },
}));

describe("internalApiClient", () => {
  const mockEvent = {} as APIGatewayProxyEvent;
  const originalEnv = process.env;
  const publicSubjectId = "test-public-subject-id";
  const defaultMaxAllowedBeforeLockout = { count: 6, window: 10800 };
  const defaultLockoutDuration = 900;
  const commonBody = {
    source: "account-delete" as any,
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env["INTERNAL_API_URL"] = "https://internal.example.com";
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should throw error when INTERNAL_API_URL is not set", () => {
      delete process.env["INTERNAL_API_URL"];

      expect(() => new InternalApiClient(mockEvent)).toThrow(
        "INTERNAL_API_URL is not set",
      );
    });

    it("should create instance with valid environment variable", () => {
      expect(new InternalApiClient(mockEvent)).toBeInstanceOf(
        InternalApiClient,
      );
    });
  });

  describe("generateOTP", () => {
    it("should make correct API call with explicit values", async () => {
      const client = new InternalApiClient(mockEvent);
      const body = {
        ...commonBody,
        reissueUnusedUnexpiredOTP: false,
        expiresIn: 600,
        maxAllowedBeforeLockout: { count: 3, window: 300 },
        lockoutDuration: 600,
      };

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.generateOTP(publicSubjectId, body);

      expect(mockThisFetch).toHaveBeenCalledWith(
        `https://internal.example.com/generate-otp/${publicSubjectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reissueUnusedUnexpiredOTP: false,
            expiresIn: 600,
            maxAllowedBeforeLockout: { count: 3, window: 300 },
            lockoutDuration: 600,
            ...commonBody,
          }),
        },
      );
    });

    it("should use defaults when optional fields are omitted", async () => {
      const client = new InternalApiClient(mockEvent);

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.generateOTP(publicSubjectId, commonBody);

      expect(mockThisFetch).toHaveBeenCalledWith(
        `https://internal.example.com/generate-otp/${publicSubjectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reissueUnusedUnexpiredOTP: true,
            expiresIn: 900,
            maxAllowedBeforeLockout: defaultMaxAllowedBeforeLockout,
            lockoutDuration: defaultLockoutDuration,
            ...commonBody,
          }),
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new InternalApiClient(mockEvent);
      const error = new Error("Network error");

      mockThisFetch.mockRejectedValueOnce(error);

      const result = await client.generateOTP(publicSubjectId, commonBody);

      expect(result).toStrictEqual({
        success: false,
        error: "UnknownError",
        rawResponse: undefined,
        errorDetails: error,
      });
    });
  });

  describe("checkOTP", () => {
    it("should make correct API call with explicit values", async () => {
      const client = new InternalApiClient(mockEvent);
      const body = {
        ...commonBody,
        otp: "123456",
        maxAllowedBeforeLockout: { count: 3, window: 300 },
        lockoutDuration: 600,
      };

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.checkOTP(publicSubjectId, body);

      expect(mockThisFetch).toHaveBeenCalledWith(
        `https://internal.example.com/check-otp/${publicSubjectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maxAllowedBeforeLockout: { count: 3, window: 300 },
            lockoutDuration: 600,
            ...commonBody,
            otp: "123456",
          }),
        },
      );
    });

    it("should use defaults when optional fields are omitted", async () => {
      const client = new InternalApiClient(mockEvent);

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.checkOTP(publicSubjectId, { ...commonBody, otp: "123456" });

      expect(mockThisFetch).toHaveBeenCalledWith(
        `https://internal.example.com/check-otp/${publicSubjectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maxAllowedBeforeLockout: defaultMaxAllowedBeforeLockout,
            lockoutDuration: defaultLockoutDuration,
            ...commonBody,
            otp: "123456",
          }),
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new InternalApiClient(mockEvent);
      const error = new Error("Network error");

      mockThisFetch.mockRejectedValueOnce(error);

      const result = await client.checkOTP(publicSubjectId, {
        ...commonBody,
        otp: "123456",
      });

      expect(result).toStrictEqual({
        success: false,
        error: "UnknownError",
        rawResponse: undefined,
        errorDetails: error,
      });
    });
  });

  describe("checkPassword", () => {
    it("should make correct API call with explicit values", async () => {
      const client = new InternalApiClient(mockEvent);
      const body = {
        ...commonBody,
        password: "hunter2", // pragma: allowlist secret
        maxAllowedBeforeLockout: { count: 3, window: 300 },
        lockoutDuration: 600,
      };

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.checkPassword(publicSubjectId, body);

      expect(mockThisFetch).toHaveBeenCalledWith(
        `https://internal.example.com/check-password/${publicSubjectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maxAllowedBeforeLockout: { count: 3, window: 300 },
            lockoutDuration: 600,
            ...commonBody,
            password: "hunter2", // pragma: allowlist secret
          }),
        },
      );
    });

    it("should use defaults when optional fields are omitted", async () => {
      const client = new InternalApiClient(mockEvent);

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.checkPassword(publicSubjectId, {
        ...commonBody,
        password: "hunter2", // pragma: allowlist secret
      });

      expect(mockThisFetch).toHaveBeenCalledWith(
        `https://internal.example.com/check-password/${publicSubjectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maxAllowedBeforeLockout: defaultMaxAllowedBeforeLockout,
            lockoutDuration: defaultLockoutDuration,
            ...commonBody,
            password: "hunter2", // pragma: allowlist secret
          }),
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new InternalApiClient(mockEvent);
      const error = new Error("Network error");

      mockThisFetch.mockRejectedValueOnce(error);

      const result = await client.checkPassword(publicSubjectId, {
        ...commonBody,
        password: "hunter2", // pragma: allowlist secret
      });

      expect(result).toStrictEqual({
        success: false,
        error: "UnknownError",
        rawResponse: undefined,
        errorDetails: error,
      });
    });
  });

  describe("getLockoutStatus", () => {
    it("should make correct API call", async () => {
      const client = new InternalApiClient(mockEvent);
      const body = { source: "account-delete" as any };

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.getLockoutStatus(publicSubjectId, body);

      expect(mockThisFetch).toHaveBeenCalledWith(
        `https://internal.example.com/lockout-status/${publicSubjectId}`,
        {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    });

    it("should make correct API call with lockoutType", async () => {
      const client = new InternalApiClient(mockEvent);
      const body = {
        source: "account-delete" as any,
        lockoutType: "TooManyOTPsRequested" as any,
      };

      mockThisFetch.mockResolvedValueOnce(new Response());

      await client.getLockoutStatus(publicSubjectId, body);

      expect(mockThisFetch).toHaveBeenCalledWith(
        `https://internal.example.com/lockout-status/${publicSubjectId}`,
        {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    });

    it("should return unknown error when fetch throws", async () => {
      const client = new InternalApiClient(mockEvent);
      const error = new Error("Network error");

      mockThisFetch.mockRejectedValueOnce(error);

      const result = await client.getLockoutStatus(publicSubjectId, {
        source: "account-delete" as any,
      });

      expect(result).toStrictEqual({
        success: false,
        error: "UnknownError",
        rawResponse: undefined,
        errorDetails: error,
      });
    });
  });
});
