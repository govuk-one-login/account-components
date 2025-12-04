import { describe, it, expect } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { getUsefulPropsForLoggingFromEvent } from "./index.js";

describe("getUsefulPropsForLoggingFromEvent", () => {
  const createMockEvent = (
    headers: Record<string, string> = {},
    sourceIp = "127.0.0.1",
  ): APIGatewayProxyEvent =>
    ({
      headers,
      requestContext: {
        identity: {
          sourceIp,
        },
      },
    }) as APIGatewayProxyEvent;

  it("returns empty object when event is undefined", () => {
    const result = getUsefulPropsForLoggingFromEvent();

    expect(result).toStrictEqual({});
  });

  it("extracts values from headers when available", () => {
    const event = createMockEvent({
      "di-persistent-session-id": "header-persistent-123",
      "session-id": "header-session-456",
      "client-session-id": "header-client-789",
      "user-language": "en",
      "x-forwarded-for": "192.168.1.1",
      "txma-audit-encoded": "audit-data",
    });

    const result = getUsefulPropsForLoggingFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: "header-persistent-123",
      sessionId: "header-session-456",
      clientSessionId: "header-client-789",
      userLanguage: "en",
      sourceIp: "192.168.1.1",
      txmaAuditEncoded: "audit-data",
    });
  });

  it("extracts values from cookies when headers not available", () => {
    const event = createMockEvent({
      cookie:
        "gs=cookie-session.cookie-client; di-persistent-session-id=cookie-persistent; lng=fr",
    });

    const result = getUsefulPropsForLoggingFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: "cookie-persistent",
      sessionId: "cookie-session",
      clientSessionId: "cookie-client",
      userLanguage: "fr",
      sourceIp: "127.0.0.1",
      txmaAuditEncoded: undefined,
    });
  });

  it("prioritizes headers over cookies when both available", () => {
    const event = createMockEvent({
      "di-persistent-session-id": "header-persistent",
      "session-id": "header-session",
      "client-session-id": "header-client",
      "user-language": "en",
      "x-forwarded-for": "192.168.1.1",
      cookie:
        "gs=cookie-session.cookie-client; di-persistent-session-id=cookie-persistent; lng=fr",
    });

    const result = getUsefulPropsForLoggingFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: "header-persistent",
      sessionId: "header-session",
      clientSessionId: "header-client",
      userLanguage: "en",
      sourceIp: "192.168.1.1",
      txmaAuditEncoded: undefined,
    });
  });

  it("falls back to requestContext sourceIp when x-forwarded-for not available", () => {
    const event = createMockEvent({}, "10.0.0.1");

    const result = getUsefulPropsForLoggingFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: undefined,
      sessionId: undefined,
      clientSessionId: undefined,
      userLanguage: undefined,
      sourceIp: "10.0.0.1",
      txmaAuditEncoded: undefined,
    });
  });

  it("handles missing cookie header gracefully", () => {
    const event = createMockEvent({});

    const result = getUsefulPropsForLoggingFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: undefined,
      sessionId: undefined,
      clientSessionId: undefined,
      userLanguage: undefined,
      sourceIp: "127.0.0.1",
      txmaAuditEncoded: undefined,
    });
  });

  it("handles malformed gs cookie gracefully", () => {
    const event = createMockEvent({
      cookie: "gs=incomplete; other=value",
    });

    const result = getUsefulPropsForLoggingFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: undefined,
      sessionId: "incomplete",
      clientSessionId: undefined,
      userLanguage: undefined,
      sourceIp: "127.0.0.1",
      txmaAuditEncoded: undefined,
    });
  });

  it("handles empty gs cookie gracefully", () => {
    const event = createMockEvent({
      cookie: "gs=; other=value",
    });

    const result = getUsefulPropsForLoggingFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: undefined,
      sessionId: undefined,
      clientSessionId: undefined,
      userLanguage: undefined,
      sourceIp: "127.0.0.1",
      txmaAuditEncoded: undefined,
    });
  });

  it("handles missing gs cookie gracefully", () => {
    const event = createMockEvent({
      cookie: "other=value; lng=es",
    });

    const result = getUsefulPropsForLoggingFromEvent(event);

    expect(result).toStrictEqual({
      persistentSessionId: undefined,
      sessionId: undefined,
      clientSessionId: undefined,
      userLanguage: "es",
      sourceIp: "127.0.0.1",
      txmaAuditEncoded: undefined,
    });
  });
});
