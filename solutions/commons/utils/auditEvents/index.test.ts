import { beforeEach, describe, expect, it, vi } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";

const mockSendMessage = vi.fn();

// @ts-expect-error
vi.mock(import("../awsClient/sqsClient/index.js"), () => ({
  getSqsClient: () => ({ sendMessage: mockSendMessage }),
}));

// @ts-expect-error
vi.mock(import("../getPropsFromAPIGatewayEvent/index.js"), () => ({
  getPropsFromAPIGatewayEvent: vi.fn((event: APIGatewayProxyEvent) => ({
    sessionId: "session-123",
    persistentSessionId: "persistent-456",
    sourceIp: "192.168.1.1",
    clientSessionId: "client-789",
    txmaAuditEncoded: event.headers["txma-audit-encoded"],
  })),
}));

const createMockEvent = (
  headers: Record<string, string> = {},
): APIGatewayProxyEvent =>
  ({
    headers,
    requestContext: { identity: { sourceIp: "127.0.0.1" } },
  }) as APIGatewayProxyEvent;

describe("getCommonAuditEventProps", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
  });

  it("returns common audit event properties", async () => {
    const { getCommonAuditEventProps } = await import("./index.js");
    const event = createMockEvent();

    const result = getCommonAuditEventProps(event);

    expect(result).toStrictEqual({
      timestamp: Math.floor(
        new Date("2024-01-15T12:00:00.000Z").getTime() / 1000,
      ),
      event_timestamp_ms: new Date("2024-01-15T12:00:00.000Z").getTime(),
      event_timestamp_ms_formatted: "2024-01-15T12:00:00.000Z",
      component_id: "AMC",
      user: {
        session_id: "session-123",
        persistent_session_id: "persistent-456",
        ip_address: "192.168.1.1",
        govuk_signin_journey_id: "client-789",
      },
    });
  });

  it("includes restricted device_information when txmaAuditEncoded is present", async () => {
    const { getCommonAuditEventProps } = await import("./index.js");
    const event = createMockEvent({ "txma-audit-encoded": "encoded-data" });

    const result = getCommonAuditEventProps(event);

    expect(result.restricted).toStrictEqual({
      device_information: { encoded: "encoded-data" },
    });
  });

  it("does not include restricted when txmaAuditEncoded is undefined", async () => {
    const { getCommonAuditEventProps } = await import("./index.js");
    const event = createMockEvent();

    const result = getCommonAuditEventProps(event);

    expect(result).not.toHaveProperty("restricted");
  });

  it("returns undefined user fields when apiGatewayProxyEvent is not provided", async () => {
    const { getCommonAuditEventProps } = await import("./index.js");

    const result = getCommonAuditEventProps();

    expect(result).toStrictEqual({
      timestamp: Math.floor(
        new Date("2024-01-15T12:00:00.000Z").getTime() / 1000,
      ),
      event_timestamp_ms: new Date("2024-01-15T12:00:00.000Z").getTime(),
      event_timestamp_ms_formatted: "2024-01-15T12:00:00.000Z",
      component_id: "AMC",
      user: {
        session_id: undefined,
        persistent_session_id: undefined,
        ip_address: undefined,
        govuk_signin_journey_id: undefined,
      },
    });
  });
});

describe("sendAuditEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env["AUDIT_EVENTS_QUEUE_URL"];
  });

  it("sends event to SQS queue", async () => {
    process.env["AUDIT_EVENTS_QUEUE_URL"] = "https://sqs.example.com/queue";
    const { sendAuditEvent } = await import("./index.js");
    const mockEvent = { event_name: "AUTH_MFA_METHOD_ADD_COMPLETED" };

    await sendAuditEvent(mockEvent);

    expect(mockSendMessage).toHaveBeenCalledWith({
      QueueUrl: "https://sqs.example.com/queue",
      MessageBody: JSON.stringify(mockEvent),
    });
  });

  it("throws when AUDIT_EVENTS_QUEUE_URL is not set", async () => {
    const { sendAuditEvent } = await import("./index.js");

    await expect(sendAuditEvent({} as never)).rejects.toThrow();
  });
});
