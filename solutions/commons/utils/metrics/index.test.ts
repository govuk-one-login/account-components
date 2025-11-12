import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { flushMetricsAPIGatewayProxyHandlerWrapper, metrics } from "./index.js";

describe("flushMetricsAPIGatewayProxyHandlerWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls handler and flushes metrics", async () => {
    const mockHandler = vi.fn().mockResolvedValue({
      statusCode: 200,
      body: "success",
    });
    const publishSpy = vi.spyOn(metrics, "publishStoredMetrics");
    const coldStartSpy = vi.spyOn(metrics, "captureColdStartMetric");

    const wrappedHandler =
      flushMetricsAPIGatewayProxyHandlerWrapper(mockHandler);

    const mockEvent = {} as APIGatewayProxyEvent;
    const mockContext = {} as Context;

    const result = await wrappedHandler(mockEvent, mockContext);

    expect(mockHandler).toHaveBeenCalledWith(mockEvent, mockContext);
    expect(coldStartSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual({ statusCode: 200, body: "success" });
  });

  it("flushes metrics even when handler throws", async () => {
    const mockHandler = vi.fn().mockRejectedValue(new Error("handler error"));
    const publishSpy = vi.spyOn(metrics, "publishStoredMetrics");
    const coldStartSpy = vi.spyOn(metrics, "captureColdStartMetric");

    const wrappedHandler =
      flushMetricsAPIGatewayProxyHandlerWrapper(mockHandler);

    const mockEvent = {} as APIGatewayProxyEvent;
    const mockContext = {} as Context;

    await expect(wrappedHandler(mockEvent, mockContext)).rejects.toThrow(
      "handler error",
    );
    expect(coldStartSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy).toHaveBeenCalledTimes(1);
  });
});
