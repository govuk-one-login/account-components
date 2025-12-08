import { describe, it, expect, vi } from "vitest";
import { handler } from "./healthcheck.js";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";

// @ts-expect-error
vi.mock(import("../../../commons/utils/logger/index.js"), () => ({
  logger: {},
  loggerAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

// @ts-expect-error
vi.mock(import("../../../commons/utils/metrics/index.js"), () => ({
  metrics: {},
  metricsAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

describe("healthcheck handler", () => {
  it("returns 200 status with ok body", async () => {
    const result = await handler({} as APIGatewayProxyEvent, {} as Context);

    expect(result).toStrictEqual({
      statusCode: 200,
      body: '"ok"',
    });
  });
});
