import { expect, it, describe } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { getDiSessionIdsFromEvent } from "./index.js";

describe("getDiSessionIdsFromEvent", () => {
  const createMockEvent = (
    headers: Record<string, string> = {},
  ): APIGatewayProxyEvent => ({
    headers,
    body: null,
    httpMethod: "GET",
    isBase64Encoded: false,
    path: "/test",
    pathParameters: null,
    queryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "",
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
  });

  it("extracts session IDs from headers when present", () => {
    const event = createMockEvent({
      "di-persistent-session-id": "persistent-123",
      "session-id": "session-456",
      "client-session-id": "client-789",
    });

    const result = getDiSessionIdsFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: "persistent-123",
      sessionId: "session-456",
      clientSessionId: "client-789",
    });
  });

  it("extracts session IDs from cookies when headers are not present", () => {
    const event = createMockEvent({
      cookie:
        "di-persistent-session-id=cookie-persistent; gs=cookie-session.cookie-client; other=value",
    });

    const result = getDiSessionIdsFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: "cookie-persistent",
      sessionId: "cookie-session",
      clientSessionId: "cookie-client",
    });
  });

  it("prioritizes headers over cookies when both are present", () => {
    const event = createMockEvent({
      "di-persistent-session-id": "header-persistent",
      "session-id": "header-session",
      "client-session-id": "header-client",
      cookie:
        "di-persistent-session-id=cookie-persistent; gs=cookie-session.cookie-client",
    });

    const result = getDiSessionIdsFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: "header-persistent",
      sessionId: "header-session",
      clientSessionId: "header-client",
    });
  });

  it("handles missing cookie header", () => {
    const event = createMockEvent({});

    const result = getDiSessionIdsFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: undefined,
      sessionId: undefined,
      clientSessionId: undefined,
    });
  });

  it("handles malformed gs cookie", () => {
    const event = createMockEvent({
      cookie: "gs=incomplete",
    });

    const result = getDiSessionIdsFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: undefined,
      sessionId: "incomplete",
      clientSessionId: undefined,
    });
  });

  it("handles empty gs cookie", () => {
    const event = createMockEvent({
      cookie: "gs=",
    });

    const result = getDiSessionIdsFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: undefined,
      sessionId: undefined,
      clientSessionId: undefined,
    });
  });

  it("handles mixed sources - some from headers, some from cookies", () => {
    const event = createMockEvent({
      "session-id": "header-session",
      cookie:
        "di-persistent-session-id=cookie-persistent; gs=cookie-session.cookie-client",
    });

    const result = getDiSessionIdsFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: "cookie-persistent",
      sessionId: "header-session",
      clientSessionId: "cookie-client",
    });
  });
});
