import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";

// @ts-expect-error
vi.mock(import("@aws-lambda-powertools/logger"), () => ({
  Logger: function MockLogger() {
    return {
      addContext: vi.fn(),
      appendKeys: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };
  },
}));

vi.mock(import("../getDiSessionIdsFromEvent/index.js"), () => ({
  getDiSessionIdsFromEvent: vi.fn().mockReturnValue({
    persistentSessionId: "persistent-123",
    sessionId: "session-456",
    clientSessionId: "client-789",
  }),
}));

import { loggerAPIGatewayProxyHandlerWrapper, logger } from "./index.js";

describe("loggerAPIGatewayProxyHandlerWrapper", () => {
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
    const wrappedHandler = loggerAPIGatewayProxyHandlerWrapper(mockHandler);

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
    expect(mockHandler).toHaveBeenCalledWith(mockEvent, mockContext);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.info).toHaveBeenCalledWith("Response", { statusCode: 200 });
    expect(result).toStrictEqual({ statusCode: 200, body: "success" });
  });

  it("falls back to cookie language when user-language header is missing", async () => {
    const eventWithoutUserLanguage = {
      ...mockEvent,
      headers: {
        ...mockEvent.headers,
        "user-language": undefined,
      },
    } as unknown as APIGatewayProxyEvent;

    const wrappedHandler = loggerAPIGatewayProxyHandlerWrapper(mockHandler);
    await wrappedHandler(eventWithoutUserLanguage, mockContext);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.appendKeys).toHaveBeenCalledWith(
      expect.objectContaining({
        userLanguage: "en",
      }),
    );
  });

  it("falls back to requestContext sourceIp when x-forwarded-for is missing", async () => {
    const eventWithoutForwardedFor = {
      ...mockEvent,
      headers: {
        ...mockEvent.headers,
        "x-forwarded-for": undefined,
      },
    } as unknown as APIGatewayProxyEvent;

    const wrappedHandler = loggerAPIGatewayProxyHandlerWrapper(mockHandler);
    await wrappedHandler(eventWithoutForwardedFor, mockContext);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.appendKeys).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceIp: "10.0.0.1",
      }),
    );
  });

  it("handles missing headers gracefully", async () => {
    const eventWithMinimalHeaders = {
      headers: {},
      httpMethod: "POST",
      path: "/minimal",
      requestContext: {
        identity: {
          sourceIp: "127.0.0.1",
        },
      },
    } as unknown as APIGatewayProxyEvent;

    const wrappedHandler = loggerAPIGatewayProxyHandlerWrapper(mockHandler);
    await wrappedHandler(eventWithMinimalHeaders, mockContext);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.appendKeys).toHaveBeenCalledWith({
      persistentSessionId: "persistent-123",
      sessionId: "session-456",
      clientSessionId: "client-789",
      userLanguage: undefined,
      sourceIp: "127.0.0.1",
      method: "POST",
      path: "/minimal",
      referer: undefined,
      trace: "session-456",
    });
  });

  it("logs response even when handler throws", async () => {
    const error = new Error("handler error");
    mockHandler.mockRejectedValue(error);
    const wrappedHandler = loggerAPIGatewayProxyHandlerWrapper(mockHandler);

    const result = await wrappedHandler(mockEvent, mockContext);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.addContext).toHaveBeenCalledWith(mockContext);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith("An error occurred", {
      error,
    });
    expect(result).toStrictEqual({ statusCode: 500, body: "" });
  });
});
