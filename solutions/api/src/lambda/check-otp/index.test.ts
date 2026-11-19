import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import assert from "node:assert";
import type { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy.js";
import type { Context } from "aws-lambda";
import {
  Source,
  LockoutType,
  oneYearInSeconds,
} from "../../../../commons/utils/constants.js";

const mockContext = {} as unknown as Context;
const mockGetLockoutErrorResponse = vi.fn();
const mockGetLatestOtp = vi.fn();
const mockDynamoDbPut = vi.fn();
const mockMaybeCreateLockout = vi.fn();

vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metricsAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

const mockLoggerInfo = vi.fn();

// @ts-expect-error
vi.mock(import("../../../../commons/utils/logger/index.js"), () => ({
  loggerAPIGatewayProxyHandlerWrapper: (fn) => fn,
  logger: { info: mockLoggerInfo },
}));

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/getSafeValibotIssues/index.js"),
  () => ({
    getSafeValibotIssues: (issues: unknown) => issues,
  }),
);

vi.mock(
  import("../../../../commons/utils/normalizeAPIGatewayProxyEventHandlerWrapper/index.js"),
  () => ({
    normalizeAPIGatewayProxyEventHandlerWrapper: (fn) => fn,
  }),
);

vi.mock(import("../../utils/lockouts/getLockoutErrorResponse.js"), () => ({
  getLockoutErrorResponse: mockGetLockoutErrorResponse,
}));

vi.mock(import("../../utils/getLatestOtp.js"), () => ({
  getLatestOtp: mockGetLatestOtp,
}));

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: () => ({
      put: mockDynamoDbPut,
    }),
  }),
);

vi.mock(import("../../utils/lockouts/maybeCreateLockout.js"), () => ({
  maybeCreateLockout: mockMaybeCreateLockout,
}));

process.env["OTPS_TABLE_NAME"] = "otps-table";
process.env["OTPS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"] = "otps-gsi";
process.env["OTP_CHECKS_TABLE_NAME"] = "otp-checks-table";
process.env["OTP_CHECKS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"] = "otp-checks-gsi";

const { handler } = await import("./index.js");

const makeEvent = (
  pathParameters: Record<string, string> | null,
  body: Record<string, unknown> | null,
): APIGatewayProxyEvent =>
  ({
    pathParameters,
    body: body !== null ? JSON.stringify(body) : null,
  }) as unknown as APIGatewayProxyEvent;

const validPathParams = { publicSubjectId: "subject-123" };
const validBody = { otp: "123456", source: Source["account-delete"] };

const NOW = new Date("2025-01-01T00:00:00.000Z");
const now = Math.floor(NOW.getTime() / 1000);

const makeExistingOtp = (overrides: Record<string, unknown> = {}) => ({
  id: "existing-otp-id",
  publicSubjectId: "subject-123",
  createdAt: now - 60,
  source: Source["account-delete"],
  used: false,
  keepUntil: now + oneYearInSeconds,
  expiresAt: now + 600,
  otp: "123456",
  ...overrides,
});

describe("check-otp handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockGetLockoutErrorResponse.mockResolvedValue(undefined);
    mockGetLatestOtp.mockResolvedValue(makeExistingOtp());
    mockDynamoDbPut.mockResolvedValue({});
    mockMaybeCreateLockout.mockResolvedValue(undefined);
    mockLoggerInfo.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("request validation", () => {
    it("returns 400 when pathParameters is null", async () => {
      const result = await handler(makeEvent(null, validBody), mockContext);

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when publicSubjectId is missing", async () => {
      const result = await handler(makeEvent({}, validBody), mockContext);

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when body is null", async () => {
      const result = await handler(
        makeEvent(validPathParams, null),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when otp is missing", async () => {
      const result = await handler(
        makeEvent(validPathParams, { source: Source["account-delete"] }),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when source is missing", async () => {
      const result = await handler(
        makeEvent(validPathParams, { otp: "123456" }),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when source is invalid", async () => {
      const result = await handler(
        makeEvent(validPathParams, { otp: "123456", source: "invalid-source" }),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when lockoutDuration is not a positive integer", async () => {
      const result = await handler(
        makeEvent(validPathParams, { ...validBody, lockoutDuration: 0 }),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when lockoutDuration is not an integer", async () => {
      const result = await handler(
        makeEvent(validPathParams, { ...validBody, lockoutDuration: 1.5 }),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when maxAllowedBeforeLockout.count is not a positive integer", async () => {
      const result = await handler(
        makeEvent(validPathParams, {
          ...validBody,
          maxAllowedBeforeLockout: { count: 0 },
        }),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when maxAllowedBeforeLockout.window is not a positive integer", async () => {
      const result = await handler(
        makeEvent(validPathParams, {
          ...validBody,
          maxAllowedBeforeLockout: { window: 0 },
        }),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("logs invalid path parameters", async () => {
      await handler(makeEvent(null, validBody), mockContext);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        "Invalid path parameters",
        expect.objectContaining({ issues: expect.anything() }),
      );
    });

    it("logs invalid body", async () => {
      await handler(makeEvent(validPathParams, null), mockContext);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        "Invalid body",
        expect.objectContaining({ issues: expect.anything() }),
      );
    });

    it("does not log invalid body when path parameters are invalid", async () => {
      await handler(makeEvent(null, validBody), mockContext);

      expect(mockLoggerInfo).not.toHaveBeenCalledWith(
        "Invalid body",
        expect.anything(),
      );
    });
  });

  describe("lockout checks", () => {
    it("returns the lockout error response when getLockoutErrorResponse returns one", async () => {
      const lockoutResponse = {
        statusCode: 403,
        body: JSON.stringify({
          code: 1003,
          message: LockoutType.TooManyIncorrectOTPsEntered,
        }),
      };
      mockGetLockoutErrorResponse.mockResolvedValue(lockoutResponse);

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual(lockoutResponse);
    });

    it("calls getLockoutErrorResponse with publicSubjectId, source and default lockoutsToCheckFor", async () => {
      await handler(makeEvent(validPathParams, validBody), mockContext);

      expect(mockGetLockoutErrorResponse).toHaveBeenCalledWith({
        publicSubjectId: "subject-123",
        source: Source["account-delete"],
        lockoutsToCheckFor: [LockoutType.TooManyIncorrectOTPsEntered],
      });
    });

    it("calls getLockoutErrorResponse with provided lockoutsToCheckFor", async () => {
      await handler(
        makeEvent(validPathParams, {
          ...validBody,
          lockoutsToCheckFor: [
            LockoutType.TooManyOTPsRequested,
            LockoutType.TooManyIncorrectOTPsEntered,
          ],
        }),
        mockContext,
      );

      expect(mockGetLockoutErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          lockoutsToCheckFor: [
            LockoutType.TooManyOTPsRequested,
            LockoutType.TooManyIncorrectOTPsEntered,
          ],
        }),
      );
    });

    it("returns 400 when lockoutsToCheckFor contains an invalid value", async () => {
      const result = await handler(
        makeEvent(validPathParams, {
          ...validBody,
          lockoutsToCheckFor: ["invalid-lockout-type"],
        }),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when lockoutsToCheckFor does not include TooManyIncorrectOTPsEntered", async () => {
      const result = await handler(
        makeEvent(validPathParams, {
          ...validBody,
          lockoutsToCheckFor: [LockoutType.TooManyOTPsRequested],
        }),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });
  });

  describe("oTP query", () => {
    it("calls getLatestOtp with correct parameters", async () => {
      await handler(makeEvent(validPathParams, validBody), mockContext);

      expect(mockGetLatestOtp).toHaveBeenCalledWith({
        publicSubjectId: "subject-123",
        source: Source["account-delete"],
      });
    });
  });

  describe("successful OTP check", () => {
    it("returns 200 with valid=true when OTP matches, is unused, and not expired", async () => {
      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 200,
        body: JSON.stringify({ valid: true }),
      });
    });

    it("marks the OTP as used in DynamoDB on success", async () => {
      await handler(makeEvent(validPathParams, validBody), mockContext);

      const putCalls = mockDynamoDbPut.mock.calls;
      const otpPutCall = putCalls.find(
        (call) => (call[0] as { TableName: string }).TableName === "otps-table",
      );
      assert.ok(otpPutCall);
      const { Item, ConditionExpression } = otpPutCall[0] as {
        Item: Record<string, unknown>;
        ConditionExpression: string;
      };

      expect(Item["used"]).toBe(true);
      expect(Item["id"]).toBe("existing-otp-id");
      expect(ConditionExpression).toBe("attribute_exists(id)");
    });

    it("writes an OTP check record with successful=true", async () => {
      await handler(makeEvent(validPathParams, validBody), mockContext);

      const putCalls = mockDynamoDbPut.mock.calls;
      const checkPutCall = putCalls.find(
        (call) =>
          (call[0] as { TableName: string }).TableName === "otp-checks-table",
      );
      assert.ok(checkPutCall);
      const { Item, ConditionExpression } = checkPutCall[0] as {
        Item: Record<string, unknown>;
        ConditionExpression: string;
      };

      expect(Item["publicSubjectId"]).toBe("subject-123");
      expect(Item["source"]).toBe(Source["account-delete"]);
      expect(Item["successful"]).toBe(true);
      expect(Item["createdAt"]).toBe(now);
      expect(Item["keepUntil"]).toBe(now + oneYearInSeconds);
      expect(ConditionExpression).toBe("attribute_not_exists(id)");
    });

    it("does not call maybeCreateLockout on success", async () => {
      await handler(makeEvent(validPathParams, validBody), mockContext);

      expect(mockMaybeCreateLockout).not.toHaveBeenCalled();
    });
  });

  describe("failed OTP check", () => {
    it("returns 200 with valid=false when OTP does not match", async () => {
      mockGetLatestOtp.mockResolvedValue(makeExistingOtp({ otp: "999999" }));

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 200,
        body: JSON.stringify({ valid: false, lockout: undefined }),
      });
    });

    it("returns 200 with valid=false when OTP is already used", async () => {
      mockGetLatestOtp.mockResolvedValue(makeExistingOtp({ used: true }));

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 200,
        body: JSON.stringify({ valid: false, lockout: undefined }),
      });
    });

    it("returns 200 with valid=false when OTP is expired", async () => {
      mockGetLatestOtp.mockResolvedValue(
        makeExistingOtp({ expiresAt: now - 1 }),
      );

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 200,
        body: JSON.stringify({ valid: false, lockout: undefined }),
      });
    });

    it("returns 200 with valid=false when no OTP exists", async () => {
      mockGetLatestOtp.mockResolvedValue(undefined);

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 200,
        body: JSON.stringify({ valid: false, lockout: undefined }),
      });
    });

    it("includes lockout in response body when lockout is created", async () => {
      const lockout = {
        type: LockoutType.TooManyIncorrectOTPsEntered,
        id: "lockout-1",
      };
      mockGetLatestOtp.mockResolvedValue(makeExistingOtp({ otp: "999999" }));
      mockMaybeCreateLockout.mockResolvedValue(lockout);

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      const { lockout: responseLockout } = JSON.parse(result.body) as {
        lockout: unknown;
      };

      expect(responseLockout).toStrictEqual(lockout);
    });

    it("writes an OTP check record with successful=false on failure", async () => {
      mockGetLatestOtp.mockResolvedValue(makeExistingOtp({ otp: "999999" }));

      await handler(makeEvent(validPathParams, validBody), mockContext);

      const putCalls = mockDynamoDbPut.mock.calls;
      const checkPutCall = putCalls.find(
        (call) =>
          (call[0] as { TableName: string }).TableName === "otp-checks-table",
      );
      assert.ok(checkPutCall);
      const { Item } = checkPutCall[0] as { Item: Record<string, unknown> };

      expect(Item["successful"]).toBe(false);
    });

    it("writes an OTP check record with successful=false when no OTP exists", async () => {
      mockGetLatestOtp.mockResolvedValue(undefined);

      await handler(makeEvent(validPathParams, validBody), mockContext);

      const checkPutCall = mockDynamoDbPut.mock.calls.find(
        (call) =>
          (call[0] as { TableName: string }).TableName === "otp-checks-table",
      );
      assert.ok(checkPutCall);
      const { Item } = checkPutCall[0] as { Item: Record<string, unknown> };

      expect(Item["successful"]).toBe(false);
    });

    it("does not mark any OTP as used on failure", async () => {
      mockGetLatestOtp.mockResolvedValue(makeExistingOtp({ otp: "999999" }));

      await handler(makeEvent(validPathParams, validBody), mockContext);

      const otpPutCall = mockDynamoDbPut.mock.calls.find(
        (call) => (call[0] as { TableName: string }).TableName === "otps-table",
      );

      expect(otpPutCall).toBeUndefined();
    });

    it("calls maybeCreateLockout with correct parameters on failure", async () => {
      mockGetLatestOtp.mockResolvedValue(makeExistingOtp({ otp: "999999" }));

      await handler(
        makeEvent(validPathParams, {
          ...validBody,
          maxAllowedBeforeLockout: { count: 3, window: 600 },
          lockoutDuration: 1800,
        }),
        mockContext,
      );

      expect(mockMaybeCreateLockout).toHaveBeenCalledWith(
        expect.objectContaining({
          publicSubjectId: "subject-123",
          source: Source["account-delete"],
          type: LockoutType.TooManyIncorrectOTPsEntered,
          tableName: "otp-checks-table",
          publicSubjectIdGsiName: "otp-checks-gsi",
          itemCountForLockout: 3,
          window: 600,
          duration: 1800,
        }),
      );
    });

    it("calls maybeCreateLockout with undefined optional params when not provided", async () => {
      mockGetLatestOtp.mockResolvedValue(makeExistingOtp({ otp: "999999" }));

      await handler(makeEvent(validPathParams, validBody), mockContext);

      expect(mockMaybeCreateLockout).toHaveBeenCalledWith(
        expect.objectContaining({
          itemCountForLockout: undefined,
          window: undefined,
          duration: undefined,
        }),
      );
    });
  });

  describe("oTP expiry boundary", () => {
    it("returns valid=true when OTP has not yet expired", async () => {
      mockGetLatestOtp.mockResolvedValue(
        makeExistingOtp({ expiresAt: now + 1 }),
      );

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      const { valid } = JSON.parse(result.body) as { valid: boolean };

      expect(valid).toBe(true);
    });

    it("returns valid=false when OTP expiresAt equals now (not strictly greater)", async () => {
      mockGetLatestOtp.mockResolvedValue(makeExistingOtp({ expiresAt: now }));

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      const { valid } = JSON.parse(result.body) as { valid: boolean };

      expect(valid).toBe(false);
    });
  });

  describe("itemShouldContributeToLockout", () => {
    const getItemShouldContributeToLockout = async () => {
      mockGetLatestOtp.mockResolvedValue(makeExistingOtp({ otp: "999999" }));
      await handler(makeEvent(validPathParams, validBody), mockContext);
      const call = mockMaybeCreateLockout.mock.calls[0];
      assert.ok(call);
      const args = call[0] as {
        itemShouldContributeToLockout: (item: {
          successful: boolean;
          lockouts?: { type: LockoutType; id: string }[];
        }) => boolean;
      };
      return args.itemShouldContributeToLockout;
    };

    it("passes a predicate that excludes successful items", async () => {
      const itemShouldContributeToLockout =
        await getItemShouldContributeToLockout();

      expect(
        itemShouldContributeToLockout({ successful: true, lockouts: [] }),
      ).toBe(false);
    });

    it("passes a predicate that excludes items with lockouts", async () => {
      const itemShouldContributeToLockout =
        await getItemShouldContributeToLockout();

      expect(
        itemShouldContributeToLockout({
          successful: false,
          lockouts: [
            { type: LockoutType.TooManyIncorrectOTPsEntered, id: "lockout-1" },
          ],
        }),
      ).toBe(false);
    });

    it("passes a predicate that includes unsuccessful items with no lockouts", async () => {
      const itemShouldContributeToLockout =
        await getItemShouldContributeToLockout();

      expect(
        itemShouldContributeToLockout({ successful: false, lockouts: [] }),
      ).toBe(true);
    });

    it("passes a predicate that includes unsuccessful items with undefined lockouts", async () => {
      const itemShouldContributeToLockout =
        await getItemShouldContributeToLockout();

      expect(itemShouldContributeToLockout({ successful: false })).toBe(true);
    });
  });
});
