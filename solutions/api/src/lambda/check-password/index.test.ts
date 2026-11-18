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
const mockDynamoDbPut = vi.fn();
const mockMaybeCreateLockout = vi.fn();
const mockVerifyPassword = vi.fn();

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

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/apiClients/accountDataApiClient.js"),
  () => ({
    AccountDataApiClient: class {
      verifyPassword = mockVerifyPassword;
    },
  }),
);

process.env["PASSWORD_CHECKS_TABLE_NAME"] = "password-checks-table";
process.env["PASSWORD_CHECKS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"] =
  "password-checks-gsi";

const { handler } = await import("./index.js");

const makeEvent = (
  pathParameters: Record<string, string> | null,
  body: Record<string, unknown> | null,
  headers: Record<string, string> = { "x-adapi-accesstoken": "test-token" },
): APIGatewayProxyEvent =>
  ({
    pathParameters,
    body: body !== null ? JSON.stringify(body) : null,
    headers,
  }) as unknown as APIGatewayProxyEvent;

const validPathParams = { publicSubjectId: "subject-123" };
const validBody = {
  password: "correct-password",
  source: Source["account-delete"],
}; // pragma: allowlist secret

const NOW = new Date("2025-01-01T00:00:00.000Z");
const now = Math.floor(NOW.getTime() / 1000);

describe("check-password handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockGetLockoutErrorResponse.mockResolvedValue(undefined);
    mockVerifyPassword.mockResolvedValue({
      success: true,
      result: { verified: true },
    });
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

    it("returns 400 when password is missing", async () => {
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
        makeEvent(validPathParams, { password: "correct-password" }), // pragma: allowlist secret
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when source is invalid", async () => {
      const result = await handler(
        makeEvent(validPathParams, {
          password: "correct-password",
          source: "invalid-source",
        }), // pragma: allowlist secret
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("returns 400 when x-adapi-accesstoken header is missing", async () => {
      const result = await handler(
        makeEvent(validPathParams, validBody, {}),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 400,
        body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
      });
    });

    it("logs invalid headers", async () => {
      await handler(makeEvent(validPathParams, validBody, {}), mockContext);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        "Invalid headers",
        expect.objectContaining({ issues: expect.anything() }),
      );
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

    it("does not log invalid path parameters or body when headers are invalid", async () => {
      await handler(makeEvent(validPathParams, validBody, {}), mockContext);

      expect(mockLoggerInfo).not.toHaveBeenCalledWith(
        "Invalid path parameters",
        expect.anything(),
      );
      expect(mockLoggerInfo).not.toHaveBeenCalledWith(
        "Invalid body",
        expect.anything(),
      );
    });

    it("does not log invalid body when path parameters are invalid", async () => {
      await handler(makeEvent(null, validBody), mockContext);

      expect(mockLoggerInfo).not.toHaveBeenCalledWith(
        "Invalid body",
        expect.anything(),
      );
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
    it("returns the lockout error response when getLockoutErrorResponse returns one", async () => {
      const lockoutResponse = {
        statusCode: 403,
        body: JSON.stringify({
          code: 1003,
          message: LockoutType.TooManyIncorrectPasswordsEntered,
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
        lockoutsToCheckFor: [LockoutType.TooManyIncorrectPasswordsEntered],
      });
    });

    it("calls getLockoutErrorResponse with provided lockoutsToCheckFor", async () => {
      await handler(
        makeEvent(validPathParams, {
          ...validBody,
          lockoutsToCheckFor: [LockoutType.TooManyIncorrectPasswordsEntered],
        }),
        mockContext,
      );

      expect(mockGetLockoutErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          lockoutsToCheckFor: [LockoutType.TooManyIncorrectPasswordsEntered],
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

    it("returns 400 when lockoutsToCheckFor does not include TooManyIncorrectPasswordsEntered", async () => {
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

  describe("verifyPassword call", () => {
    it("calls verifyPassword with publicSubjectId and password", async () => {
      await handler(makeEvent(validPathParams, validBody), mockContext);

      expect(mockVerifyPassword).toHaveBeenCalledWith(
        "subject-123",
        "correct-password",
      );
    });
  });

  describe("successful password check", () => {
    it("returns 204 when password is correct", async () => {
      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({ statusCode: 204, body: "" });
    });

    it("writes a password check record with successful=true", async () => {
      await handler(makeEvent(validPathParams, validBody), mockContext);

      const call = mockDynamoDbPut.mock.calls[0];
      assert.ok(call);
      const { Item, ConditionExpression } = call[0] as {
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

  describe("failed password check", () => {
    it("returns 401 with code 1005 when password is incorrect", async () => {
      mockVerifyPassword.mockResolvedValue({
        success: true,
        result: { verified: false },
      });

      const result = await handler(
        makeEvent(validPathParams, validBody),
        mockContext,
      );

      expect(result).toStrictEqual({
        statusCode: 401,
        body: JSON.stringify({ code: 1005, message: "InvalidPassword" }),
      });
    });

    it("throws when verifyPassword call fails", async () => {
      mockVerifyPassword.mockResolvedValue({
        success: false,
        error: "some error",
      });

      await expect(
        handler(makeEvent(validPathParams, validBody), mockContext),
      ).rejects.toThrow("some error");
    });

    it("writes a password check record with successful=false on failure", async () => {
      mockVerifyPassword.mockResolvedValue({
        success: true,
        result: { verified: false },
      });

      await handler(makeEvent(validPathParams, validBody), mockContext);

      const call = mockDynamoDbPut.mock.calls[0];
      assert.ok(call);
      const { Item } = call[0] as {
        Item: Record<string, unknown>;
      };

      expect(Item["successful"]).toBe(false);
    });

    it("calls maybeCreateLockout with correct parameters on failure", async () => {
      mockVerifyPassword.mockResolvedValue({
        success: true,
        result: { verified: false },
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
          type: LockoutType.TooManyIncorrectPasswordsEntered,
          tableName: "password-checks-table",
          publicSubjectIdGsiName: "password-checks-gsi",
          itemCountForLockout: 3,
          window: 600,
          duration: 1800,
        }),
      );
    });

    it("calls maybeCreateLockout with undefined optional params when not provided", async () => {
      mockVerifyPassword.mockResolvedValue({
        success: true,
        result: { verified: false },
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

  describe("itemShouldContributeToLockout", () => {
    const getItemShouldContributeToLockout = async () => {
      mockVerifyPassword.mockResolvedValue({
        success: true,
        result: { verified: false },
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
            {
              type: LockoutType.TooManyIncorrectPasswordsEntered,
              id: "lockout-1",
            },
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
