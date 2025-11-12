import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy.js";
import type { Context } from "aws-lambda";

const mockMetrics = {
  addMetric: vi.fn(),
  addDimensions: vi.fn(),
};
const mockContext = {} as unknown as Context;

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: mockMetrics,
  flushMetricsAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

const { handler } = await import("./index.js");

describe("journeyoutcome handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 status with hello world body", async () => {
    const mockValidEvent = {
      headers: { Authorization: "Bearer blah" },
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(mockValidEvent, mockContext);

    expect(result).toStrictEqual({
      statusCode: 200,
      body: '"hello world"',
    });
  });

  it("returns 400 status with error for missing Authorization header", async () => {
    const mockInvalidEvent = {
      headers: { foo: "bar" },
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(mockInvalidEvent, mockContext);

    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "InvalidAuthorizationHeader",
      "Count",
      1,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4006",
      }),
    });
  });

  it("returns 400 status with error for invalid Authorization header", async () => {
    const mockInvalidEvent = {
      headers: { foo: "bar", Authorization: "blahhhhh" },
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(mockInvalidEvent, mockContext);

    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "InvalidAuthorizationHeader",
      "Count",
      1,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4006",
      }),
    });
  });
});
