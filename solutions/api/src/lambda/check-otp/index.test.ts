import { describe, it, expect, vi } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy.js";
import type { Context } from "aws-lambda";

const mockContext = {} as unknown as Context;

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

const { handler } = await import("./index.js");

describe("check-otp handler", () => {
  it("returns 200", async () => {
    const mockEvent = {} as unknown as APIGatewayProxyEvent;

    const result = await handler(mockEvent, mockContext);

    expect(result).toStrictEqual({
      statusCode: 200,
      body: JSON.stringify({ TODO: "TODO" }),
    });
  });
});
