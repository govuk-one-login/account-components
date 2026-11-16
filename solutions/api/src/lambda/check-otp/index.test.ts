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
const mockGetLockouts = vi.fn();
const mockDynamoDbQuery = vi.fn();
const mockDynamoDbPut = vi.fn();
const mockMaybeCreateLockout = vi.fn();

vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metricsAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

vi.mock(import("../../../../commons/utils/logger/index.js"), () => ({
  loggerAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

vi.mock(
  import("../../../../commons/utils/normalizeAPIGatewayProxyEventHandlerWrapper/index.js"),
  () => ({
    normalizeAPIGatewayProxyEventHandlerWrapper: (fn) => fn,
  }),
);

vi.mock(import("../../utils/getLockouts.js"), () => ({
  getLockouts: mockGetLockouts,
}));

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: () => ({
      query: mockDynamoDbQuery,
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
    mockGetLockouts.mockResolvedValue([]);
    mockDynamoDbQuery.mockResolvedValue({ Items: [makeExistingOtp()] });
    mockDynamoDbPut.mockResolvedValue({});
    mockMaybeCreateLockout.mockResolvedValue(undefined);
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
  });

  describe("lockout checks", () => {
    it("calls getLockouts with publicSubjectId and source", async () => {
      await handler(makeEvent(validPathParams, validBody), mockContext);

      expect(mockGetLockouts).toHaveBeenCalledWith({
        publicSubjectId: "subject-123",
        source: Source["account-delete"],
      });
    });

    it("returns 403 with code 1002 when TooManyOTPsRequested lockout exists", async () => {
      mockGetLockouts.mockResolvedValue([
        { type: LockoutType.TooManyOTPsRequested },
      ]);

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 403,
        body: JSON.stringify({
          code: 1002,
          message: LockoutType.TooManyOTPsRequested,
        }),
      });
    });

    it("returns 403 with code 1003 when TooManyIncorrectOTPsEntered lockout exists", async () => {
      mockGetLockouts.mockResolvedValue([
        { type: LockoutType.TooManyIncorrectOTPsEntered },
      ]);

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 403,
        body: JSON.stringify({
          code: 1003,
          message: LockoutType.TooManyIncorrectOTPsEntered,
        }),
      });
    });

    it("returns 403 with code 1004 when TooManyIncorrectPasswordsEntered lockout exists", async () => {
      mockGetLockouts.mockResolvedValue([
        { type: LockoutType.TooManyIncorrectPasswordsEntered },
      ]);

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 403,
        body: JSON.stringify({
          code: 1004,
          message: LockoutType.TooManyIncorrectPasswordsEntered,
        }),
      });
    });
  });

  describe("oTP query", () => {
    it("queries DynamoDB with correct parameters", async () => {
      await handler(makeEvent(validPathParams, validBody), mockContext);

      expect(mockDynamoDbQuery).toHaveBeenCalledWith({
        TableName: "otps-table",
        IndexName: "otps-gsi",
        KeyConditionExpression: "publicSubjectId = :publicSubjectId",
        FilterExpression: "#source = :source",
        ExpressionAttributeValues: {
          ":publicSubjectId": "subject-123",
          ":source": Source["account-delete"],
        },
        ExpressionAttributeNames: {
          "#source": "source",
        },
        ScanIndexForward: false,
      });
    });
  });

  describe("successful OTP check", () => {
    it("returns 204 when OTP matches, is unused, and not expired", async () => {
      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({ statusCode: 204, body: "" });
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
    it("returns 401 with code 1005 when OTP does not match", async () => {
      mockDynamoDbQuery.mockResolvedValue({
        Items: [makeExistingOtp({ otp: "999999" })],
      });

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 401,
        body: JSON.stringify({ code: 1005, message: "InvalidOTP" }),
      });
    });

    it("returns 401 when OTP is already used", async () => {
      mockDynamoDbQuery.mockResolvedValue({
        Items: [makeExistingOtp({ used: true })],
      });

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 401,
        body: JSON.stringify({ code: 1005, message: "InvalidOTP" }),
      });
    });

    it("returns 401 when OTP is expired", async () => {
      mockDynamoDbQuery.mockResolvedValue({
        Items: [makeExistingOtp({ expiresAt: now - 1 })],
      });

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 401,
        body: JSON.stringify({ code: 1005, message: "InvalidOTP" }),
      });
    });

    it("returns 401 when no OTP exists", async () => {
      mockDynamoDbQuery.mockResolvedValue({ Items: [] });

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 401,
        body: JSON.stringify({ code: 1005, message: "InvalidOTP" }),
      });
    });

    it("writes an OTP check record with successful=false on failure", async () => {
      mockDynamoDbQuery.mockResolvedValue({
        Items: [makeExistingOtp({ otp: "999999" })],
      });

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
      mockDynamoDbQuery.mockResolvedValue({ Items: [] });

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
      mockDynamoDbQuery.mockResolvedValue({
        Items: [makeExistingOtp({ otp: "999999" })],
      });

      await handler(makeEvent(validPathParams, validBody), mockContext);

      const otpPutCall = mockDynamoDbPut.mock.calls.find(
        (call) => (call[0] as { TableName: string }).TableName === "otps-table",
      );

      expect(otpPutCall).toBeUndefined();
    });

    it("calls maybeCreateLockout with correct parameters on failure", async () => {
      mockDynamoDbQuery.mockResolvedValue({
        Items: [makeExistingOtp({ otp: "999999" })],
      });

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
      mockDynamoDbQuery.mockResolvedValue({
        Items: [makeExistingOtp({ otp: "999999" })],
      });

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
    it("returns 204 when OTP expires exactly at now", async () => {
      mockDynamoDbQuery.mockResolvedValue({
        Items: [makeExistingOtp({ expiresAt: now + 1 })],
      });

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result.statusCode).toBe(204);
    });

    it("returns 401 when OTP expiresAt equals now (not strictly greater)", async () => {
      mockDynamoDbQuery.mockResolvedValue({
        Items: [makeExistingOtp({ expiresAt: now })],
      });

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result.statusCode).toBe(401);
    });
  });

  describe("itemShouldContributeToLockout", () => {
    const getItemShouldContributeToLockout = async () => {
      mockDynamoDbQuery.mockResolvedValue({
        Items: [makeExistingOtp({ otp: "999999" })],
      });
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
