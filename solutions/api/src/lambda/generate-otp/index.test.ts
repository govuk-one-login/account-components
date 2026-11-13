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

const { handler } = await import("./index.js");

const makeEvent = (
  pathParameters: Record<string, string> | null,
  body: Record<string, unknown> | null,
): APIGatewayProxyEvent =>
  ({
    pathParameters,
    body: body !== null ? JSON.stringify(body) : null,
  }) as unknown as APIGatewayProxyEvent;

const validBody = { source: Source["account-delete"] };
const validPathParams = { publicSubjectId: "subject-123" };

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

describe("generate-otp handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockGetLockouts.mockResolvedValue([]);
    mockDynamoDbQuery.mockResolvedValue({ Items: [] });
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

    it("returns 400 when source is missing", async () => {
      const result = await handler(makeEvent(validPathParams, {}), mockContext);

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when source is invalid", async () => {
      const result = await handler(
        makeEvent(validPathParams, { source: "invalid-source" }),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when expiresIn is not an integer", async () => {
      const result = await handler(
        makeEvent(validPathParams, { ...validBody, expiresIn: 1.5 }),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when expiresIn is 0", async () => {
      const result = await handler(
        makeEvent(validPathParams, { ...validBody, expiresIn: 0 }),
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

    it("calls getLockouts with publicSubjectId and source", async () => {
      await handler(makeEvent(validPathParams, validBody), mockContext);

      expect(mockGetLockouts).toHaveBeenCalledWith({
        publicSubjectId: "subject-123",
        source: Source["account-delete"],
      });
    });
  });

  describe("oTP generation", () => {
    it("returns 200 with a new otp and expiresAt when no existing OTP", async () => {
      mockDynamoDbQuery.mockResolvedValue({ Items: [] });

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body) as {
        otp: string;
        expiresAt: number;
      };

      expect(responseBody.otp).toMatch(/^\d{6}$/);
      expect(responseBody.expiresAt).toBeTypeOf("number");
    });

    it("uses default expiresIn of 900 seconds when not specified", async () => {
      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      const { expiresAt } = JSON.parse(result.body);

      expect(expiresAt).toBe(now + 900);
    });

    it("uses provided expiresIn when specified", async () => {
      const result = await handler(
        makeEvent(validPathParams, { ...validBody, expiresIn: 300 }),
        mockContext,
      );

      const { expiresAt } = JSON.parse(result.body);

      expect(expiresAt).toBe(now + 300);
    });

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
        Limit: 1,
      });
    });

    it("puts the new OTP item in DynamoDB with correct fields", async () => {
      await handler(makeEvent(validPathParams, validBody), mockContext);

      const call = mockDynamoDbPut.mock.calls[0];
      assert.ok(call);
      const { Item } = call[0] as { Item: Record<string, unknown> };

      expect(Item["publicSubjectId"]).toBe("subject-123");
      expect(Item["source"]).toBe(Source["account-delete"]);
      expect(Item["used"]).toBe(false);
      expect(Item["createdAt"]).toBe(now);
      expect(Item["keepUntil"]).toBe(now + oneYearInSeconds);
      expect(mockDynamoDbPut).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: "otps-table",
          ConditionExpression: "attribute_not_exists(id)",
        }),
      );
    });

    it("calls maybeCreateLockout with correct parameters", async () => {
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
          type: LockoutType.TooManyOTPsRequested,
          tableName: "otps-table",
          publicSubjectIdGsiName: "otps-gsi",
          itemCountForLockout: 3,
          window: 600,
          duration: 1800,
        }),
      );
    });

    it("calls maybeCreateLockout with undefined optional params when not provided", async () => {
      await handler(makeEvent(validPathParams, validBody), mockContext);

      expect(mockMaybeCreateLockout).toHaveBeenCalledWith(
        expect.objectContaining({
          itemCountForLockout: undefined,
          window: undefined,
          duration: undefined,
        }),
      );
    });

    it("passes only count to maybeCreateLockout when maxAllowedBeforeLockout has only count", async () => {
      await handler(
        makeEvent(validPathParams, {
          ...validBody,
          maxAllowedBeforeLockout: { count: 5 },
        }),
        mockContext,
      );

      expect(mockMaybeCreateLockout).toHaveBeenCalledWith(
        expect.objectContaining({
          itemCountForLockout: 5,
          window: undefined,
        }),
      );
    });

    it("passes only window to maybeCreateLockout when maxAllowedBeforeLockout has only window", async () => {
      await handler(
        makeEvent(validPathParams, {
          ...validBody,
          maxAllowedBeforeLockout: { window: 600 },
        }),
        mockContext,
      );

      expect(mockMaybeCreateLockout).toHaveBeenCalledWith(
        expect.objectContaining({
          itemCountForLockout: undefined,
          window: 600,
        }),
      );
    });
  });

  describe("oTP reuse", () => {
    it("reuses existing OTP when reissueUnusedUnexpiredOTP is true (default) and OTP is unused and not near expiry", async () => {
      const existingOtp = makeExistingOtp({ expiresAt: now + 600 });
      mockDynamoDbQuery.mockResolvedValue({ Items: [existingOtp] });

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      const responseBody = JSON.parse(result.body) as {
        otp: string;
        expiresAt: number;
      };

      expect(responseBody.otp).toBe(existingOtp.otp);
      expect(responseBody.expiresAt).toBe(existingOtp.expiresAt);
    });

    it("writes the reused otp and expiresAt to DynamoDB when reusing", async () => {
      const existingOtp = makeExistingOtp({ expiresAt: now + 600 });
      mockDynamoDbQuery.mockResolvedValue({ Items: [existingOtp] });

      await handler(makeEvent(validPathParams, validBody), mockContext);

      const call = mockDynamoDbPut.mock.calls[0];
      assert.ok(call);
      const { Item } = call[0] as { Item: Record<string, unknown> };

      expect(Item["otp"]).toBe(existingOtp.otp);
      expect(Item["expiresAt"]).toBe(existingOtp.expiresAt);
    });

    it("reuses existing OTP when reissueUnusedUnexpiredOTP is explicitly true", async () => {
      const existingOtp = makeExistingOtp({ expiresAt: now + 600 });
      mockDynamoDbQuery.mockResolvedValue({ Items: [existingOtp] });

      const result = await handler(
        makeEvent(validPathParams, {
          ...validBody,
          reissueUnusedUnexpiredOTP: true,
        }),
        mockContext,
      );

      const { otp } = JSON.parse(result.body);

      expect(otp).toBe(existingOtp.otp);
    });

    it("generates new OTP when reissueUnusedUnexpiredOTP is false", async () => {
      const existingOtp = makeExistingOtp({ expiresAt: now + 600 });
      mockDynamoDbQuery.mockResolvedValue({ Items: [existingOtp] });

      const result = await handler(
        makeEvent(validPathParams, {
          ...validBody,
          reissueUnusedUnexpiredOTP: false,
        }),
        mockContext,
      );

      const { otp } = JSON.parse(result.body);

      expect(otp).not.toBe(existingOtp.otp);
    });

    it("generates new OTP when existing OTP is already used", async () => {
      const existingOtp = makeExistingOtp({ used: true, expiresAt: now + 600 });
      mockDynamoDbQuery.mockResolvedValue({ Items: [existingOtp] });

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      const { otp } = JSON.parse(result.body);

      expect(otp).not.toBe(existingOtp.otp);
    });

    it("generates new OTP when expiresIn would result in an earlier expiry than the existing OTP", async () => {
      const existingOtp = makeExistingOtp({ expiresAt: now + 600 });
      mockDynamoDbQuery.mockResolvedValue({ Items: [existingOtp] });

      const result = await handler(
        makeEvent(validPathParams, { ...validBody, expiresIn: 599 }),
        mockContext,
      );

      const { otp } = JSON.parse(result.body);

      expect(otp).not.toBe(existingOtp.otp);
    });

    it("reuses existing OTP when expiresIn would result in the same expiry as the existing OTP", async () => {
      const existingOtp = makeExistingOtp({ expiresAt: now + 600 });
      mockDynamoDbQuery.mockResolvedValue({ Items: [existingOtp] });

      const result = await handler(
        makeEvent(validPathParams, { ...validBody, expiresIn: 600 }),
        mockContext,
      );

      const { otp } = JSON.parse(result.body);

      expect(otp).toBe(existingOtp.otp);
    });

    it("generates new OTP when existing OTP expires within 120 seconds", async () => {
      const existingOtp = makeExistingOtp({ expiresAt: now + 119 });
      mockDynamoDbQuery.mockResolvedValue({ Items: [existingOtp] });

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      const { otp } = JSON.parse(result.body);

      expect(otp).not.toBe(existingOtp.otp);
    });

    it("reuses existing OTP when it expires exactly at now + 120", async () => {
      const existingOtp = makeExistingOtp({ expiresAt: now + 120 });
      mockDynamoDbQuery.mockResolvedValue({ Items: [existingOtp] });

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      const { otp } = JSON.parse(result.body);

      expect(otp).toBe(existingOtp.otp);
    });

    it("generates new OTP when no existing OTP is found", async () => {
      mockDynamoDbQuery.mockResolvedValue({ Items: [] });

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result.statusCode).toBe(200);

      const { otp } = JSON.parse(result.body);

      expect(otp).toMatch(/^\d{6}$/);
    });
  });

  describe("itemShouldContributeToLockout", () => {
    const getItemShouldContributeToLockout = async () => {
      await handler(makeEvent(validPathParams, validBody), mockContext);
      const call = mockMaybeCreateLockout.mock.calls[0];
      assert.ok(call);
      const args = call[0] as {
        itemShouldContributeToLockout: (item: {
          used: boolean;
          lockouts?: { type: LockoutType; id: string }[];
        }) => boolean;
      };
      return args.itemShouldContributeToLockout;
    };

    it("passes a predicate that excludes used items", async () => {
      const itemShouldContributeToLockout =
        await getItemShouldContributeToLockout();

      expect(itemShouldContributeToLockout({ used: true, lockouts: [] })).toBe(
        false,
      );
    });

    it("passes a predicate that excludes items with lockouts", async () => {
      const itemShouldContributeToLockout =
        await getItemShouldContributeToLockout();

      expect(
        itemShouldContributeToLockout({
          used: false,
          lockouts: [
            { type: LockoutType.TooManyOTPsRequested, id: "lockout-1" },
          ],
        }),
      ).toBe(false);
    });

    it("passes a predicate that includes unused items with no lockouts", async () => {
      const itemShouldContributeToLockout =
        await getItemShouldContributeToLockout();

      expect(itemShouldContributeToLockout({ used: false, lockouts: [] })).toBe(
        true,
      );
    });

    it("passes a predicate that includes unused items with undefined lockouts", async () => {
      const itemShouldContributeToLockout =
        await getItemShouldContributeToLockout();

      expect(itemShouldContributeToLockout({ used: false })).toBe(true);
    });
  });
});
