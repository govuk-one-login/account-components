import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy.js";
import type { Context } from "aws-lambda";
import { Source, LockoutType } from "../../../../commons/utils/constants.js";

const mockContext = {} as unknown as Context;
const mockGetLockouts = vi.fn();

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

const { handler } = await import("./index.js");

const makeEvent = (
  pathParameters: Record<string, string> | null,
  queryStringParameters: Record<string, string> | null = null,
): APIGatewayProxyEvent =>
  ({
    pathParameters,
    queryStringParameters,
  }) as unknown as APIGatewayProxyEvent;

describe("lockouts handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when pathParameters is null", async () => {
    const result = await handler(
      makeEvent(null, { source: Source["account-delete"] }),
      mockContext,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
    });
  });

  it("returns 400 when publicSubjectId is missing", async () => {
    const result = await handler(
      makeEvent({}, { source: Source["account-delete"] }),
      mockContext,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
    });
  });

  it("returns 400 when source is missing", async () => {
    const result = await handler(
      makeEvent({ publicSubjectId: "subject-123" }, {}),
      mockContext,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
    });
  });

  it("returns 400 when source is invalid", async () => {
    const result = await handler(
      makeEvent(
        { publicSubjectId: "subject-123" },
        { source: "invalid-source" },
      ),
      mockContext,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
    });
  });

  it("returns 200 with lockouts when required params are valid", async () => {
    const lockouts = [{ id: "lockout-1" }];
    mockGetLockouts.mockResolvedValue(lockouts);

    const result = await handler(
      makeEvent(
        { publicSubjectId: "subject-123" },
        { source: Source["account-delete"] },
      ),
      mockContext,
    );

    expect(result).toStrictEqual({
      statusCode: 200,
      body: JSON.stringify(lockouts),
    });
  });

  it("calls getLockouts with publicSubjectId and source", async () => {
    mockGetLockouts.mockResolvedValue([]);

    await handler(
      makeEvent(
        { publicSubjectId: "subject-123" },
        { source: Source["account-delete"] },
      ),
      mockContext,
    );

    expect(mockGetLockouts).toHaveBeenCalledWith({
      publicSubjectId: "subject-123",
      source: Source["account-delete"],
      type: undefined,
    });
  });

  it("calls getLockouts with type when provided", async () => {
    mockGetLockouts.mockResolvedValue([]);

    await handler(
      makeEvent(
        { publicSubjectId: "subject-123" },
        {
          source: Source["account-delete"],
          type: LockoutType.TooManyOTPsRequested,
        },
      ),
      mockContext,
    );

    expect(mockGetLockouts).toHaveBeenCalledWith({
      publicSubjectId: "subject-123",
      source: Source["account-delete"],
      type: LockoutType.TooManyOTPsRequested,
    });
  });

  it("returns 400 when type is invalid", async () => {
    const result = await handler(
      makeEvent(
        { publicSubjectId: "subject-123" },
        { source: Source["account-delete"], type: "invalid-type" },
      ),
      mockContext,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
    });
  });
});
