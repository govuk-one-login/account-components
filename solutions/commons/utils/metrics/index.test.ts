import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { metricsAPIGatewayProxyHandlerWrapper, metrics } from "./index.js";

describe("metricsAPIGatewayProxyHandlerWrapper", () => {
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
    const addDimensionsSpy = vi.spyOn(metrics, "addDimensions");

    const wrappedHandler = metricsAPIGatewayProxyHandlerWrapper(mockHandler);

    const mockEvent = {
      httpMethod: "GET",
      path: "/test-path",
    } as APIGatewayProxyEvent;
    const mockContext = {} as Context;

    const result = await wrappedHandler(mockEvent, mockContext);

    expect(mockHandler).toHaveBeenCalledWith(mockEvent, mockContext);
    expect(addDimensionsSpy).toHaveBeenCalledWith({
      method: "GET",
      path: "/test-path",
    });
    expect(coldStartSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual({ statusCode: 200, body: "success" });
  });

  it("returns 500 response and flushes metrics when handler throws", async () => {
    const mockHandler = vi.fn().mockRejectedValue(new Error("handler error"));
    const publishSpy = vi.spyOn(metrics, "publishStoredMetrics");
    const coldStartSpy = vi.spyOn(metrics, "captureColdStartMetric");
    const addDimensionsSpy = vi.spyOn(metrics, "addDimensions");

    const wrappedHandler = metricsAPIGatewayProxyHandlerWrapper(mockHandler);

    const mockEvent = {
      httpMethod: "POST",
      path: "/error-path",
    } as APIGatewayProxyEvent;
    const mockContext = {} as Context;

    const result = await wrappedHandler(mockEvent, mockContext);

    expect(mockHandler).toHaveBeenCalledWith(mockEvent, mockContext);
    expect(addDimensionsSpy).toHaveBeenCalledWith({
      method: "POST",
      path: "/error-path",
    });
    expect(coldStartSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual({ statusCode: 500, body: "" });
  });
});
