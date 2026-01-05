import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import {
  observabilityAPIGatewayProxyHandlerWrapper,
  logger,
  metrics,
  setObservabilityAttributes,
  trace,
} from "./index.js";
import assert from "node:assert";

// @ts-expect-error
vi.mock(import("@aws-lambda-powertools/logger"), () => ({
  Logger: function MockLogger() {
    return {
      addContext: vi.fn(),
      appendKeys: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      resetKeys: vi.fn(),
    };
  },
}));

// @ts-expect-error
vi.mock(import("@aws-lambda-powertools/metrics"), () => ({
  Metrics: function MockMetrics() {
    return {
      addDimensions: vi.fn(),
      captureColdStartMetric: vi.fn(),
      publishStoredMetrics: vi.fn(),
    };
  },
}));

// @ts-expect-error
vi.mock(import("@opentelemetry/api"), () => ({
  trace: {
    getActiveSpan: vi.fn().mockReturnValue({
      isRecording: vi.fn().mockReturnValue(true),
      setAttributes: vi.fn(),
    }),
  },
}));

vi.mock(import("../getPropsForLoggingFromEvent/index.js"), () => ({
  getPropsForLoggingFromEvent: vi.fn().mockReturnValue({
    persistentSessionId: "persistent-123",
    sessionId: "session-456",
    clientSessionId: "client-789",
    userLanguage: "fr",
    sourceIp: "192.168.1.1",
  }),
}));

describe("observabilityAPIGatewayProxyHandlerWrapper", () => {
  const mockHandler = vi.fn();
  const mockEvent = {
    headers: {
      cookie: "lng=en; di-persistent-session-id=cookie-persistent",
      "user-language": "fr",
      "x-forwarded-for": "192.168.1.1",
      referer: "https://example.com",
    },
    httpMethod: "GET",
    path: "/test-path",
    requestContext: {
      identity: {
        sourceIp: "10.0.0.1",
      },
    },
  } as unknown as APIGatewayProxyEvent;
  const mockContext = {} as Context;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHandler.mockResolvedValue({
      statusCode: 200,
      body: "success",
    });
  });

  it("enriches logs with request context and calls handler", async () => {
    const wrappedHandler =
      observabilityAPIGatewayProxyHandlerWrapper(mockHandler);

    const result = await wrappedHandler(mockEvent, mockContext);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.addContext).toHaveBeenCalledWith(mockContext);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.appendKeys).toHaveBeenCalledWith({
      persistentSessionId: "persistent-123",
      sessionId: "session-456",
      clientSessionId: "client-789",
      userLanguage: "fr",
      sourceIp: "192.168.1.1",
      method: "GET",
      path: "/test-path",
      referer: "https://example.com",
      trace: "session-456",
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metrics.addDimensions).toHaveBeenCalledWith({
      persistentSessionId: "persistent-123",
      sessionId: "session-456",
      clientSessionId: "client-789",
      userLanguage: "fr",
      sourceIp: "192.168.1.1",
      method: "GET",
      path: "/test-path",
      referer: "https://example.com",
      trace: "session-456",
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(trace.getActiveSpan()?.setAttributes).toHaveBeenCalledWith({
      persistentSessionId: "persistent-123",
      sessionId: "session-456",
      clientSessionId: "client-789",
      userLanguage: "fr",
      sourceIp: "192.168.1.1",
      method: "GET",
      path: "/test-path",
      referer: "https://example.com",
      trace: "session-456",
    });
    expect(mockHandler).toHaveBeenCalledWith(mockEvent, mockContext);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metrics.captureColdStartMetric).toHaveBeenCalledWith();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metrics.publishStoredMetrics).toHaveBeenCalledWith();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.info).toHaveBeenCalledWith("Response", { statusCode: 200 });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.resetKeys).toHaveBeenCalledWith();
    expect(result).toStrictEqual({ statusCode: 200, body: "success" });
  });

  it("logs response even when handler throws", async () => {
    const error = new Error("handler error");
    mockHandler.mockRejectedValue(error);
    const wrappedHandler =
      observabilityAPIGatewayProxyHandlerWrapper(mockHandler);

    const result = await wrappedHandler(mockEvent, mockContext);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.addContext).toHaveBeenCalledWith(mockContext);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith("An error occurred", {
      error,
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metrics.captureColdStartMetric).toHaveBeenCalledWith();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metrics.publishStoredMetrics).toHaveBeenCalledWith();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.resetKeys).toHaveBeenCalledWith();
    expect(result).toStrictEqual({ statusCode: 500, body: "" });
  });
});

describe("setObservabilityAttributes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets attributes on logger, span, and metrics", () => {
    const attributes = {
      stringValue: "test",
      numberValue: 123,
      booleanValue: true,
    };

    setObservabilityAttributes(attributes);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.appendKeys).toHaveBeenCalledWith({
      stringValue: "test",
      numberValue: "123",
      booleanValue: "true",
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(trace.getActiveSpan()?.setAttributes).toHaveBeenCalledWith({
      stringValue: "test",
      numberValue: "123",
      booleanValue: "true",
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metrics.addDimensions).toHaveBeenCalledWith({
      stringValue: "test",
      numberValue: "123",
      booleanValue: "true",
    });
  });

  it("skips span attributes when span is not recording", () => {
    const mockSpan = trace.getActiveSpan();
    assert.ok(mockSpan);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(mockSpan.isRecording).mockReturnValue(false);
    const attributes = { test: "value" };

    setObservabilityAttributes(attributes);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(trace.getActiveSpan()?.setAttributes).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.appendKeys).toHaveBeenCalledWith({ test: "value" });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metrics.addDimensions).toHaveBeenCalledWith({ test: "value" });
  });
});
