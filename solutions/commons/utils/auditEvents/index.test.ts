import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendAuditEvent } from "./index.js";
import type { APIGatewayProxyEvent } from "aws-lambda";

const mockSendMessage = vi.fn();
const mockGetPropsFromAPIGatewayEvent = vi.fn();

// @ts-expect-error
vi.mock(import("../awsClient/sqsClient/index.js"), () => ({
  getSqsClient: vi.fn(() => ({
    sendMessage: vi.fn(),
  })),
}));

vi.mock(import("../getPropsFromAPIGatewayEvent/index.js"), () => ({
  getPropsFromAPIGatewayEvent: vi.fn(),
}));

describe("sendAuditEvent", () => {
  const originalEnv = process.env["AUDIT_EVENTS_QUEUE_URL"];
  const mockApiGatewayEvent = {} as APIGatewayProxyEvent;

  beforeEach(async () => {
    const { getSqsClient } = await import("../awsClient/sqsClient/index.js");
    const { getPropsFromAPIGatewayEvent } =
      await import("../getPropsFromAPIGatewayEvent/index.js");
    vi.mocked(getSqsClient).mockReturnValue({
      sendMessage: mockSendMessage,
    } as never);
    vi.mocked(getPropsFromAPIGatewayEvent).mockImplementation(
      mockGetPropsFromAPIGatewayEvent,
    );

    process.env["AUDIT_EVENTS_QUEUE_URL"] =
      "https://sqs.eu-west-2.amazonaws.com/123456789012/audit-queue";
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));

    mockGetPropsFromAPIGatewayEvent.mockReturnValue({
      sessionId: "session-123",
      persistentSessionId: "persistent-123",
      sourceIp: "192.168.1.1",
      clientSessionId: "client-session-123",
    });
  });

  afterEach(() => {
    process.env["AUDIT_EVENTS_QUEUE_URL"] = originalEnv;
    vi.useRealTimers();
  });

  it("should send audit event to SQS queue", async () => {
    const event = {
      event_name: "TODO1" as const,
      client_id: "client-123",
      user_id: "user-123",
      email: "test@example.com",
      user: {
        extraUserField: "123456",
      },
      extraMiscField: {
        value: 98765,
      },
    };

    await sendAuditEvent(event, mockApiGatewayEvent);

    expect(mockSendMessage).toHaveBeenCalledWith({
      QueueUrl: "https://sqs.eu-west-2.amazonaws.com/123456789012/audit-queue",
      MessageBody: JSON.stringify({
        timestamp: 1704110400,
        event_timestamp_ms: 1704110400000,
        event_timestamp_ms_formatted: "2024-01-01T12:00:00.000Z",
        component_id: "AMC",
        user: {
          session_id: "session-123",
          persistent_session_id: "persistent-123",
          ip_address: "192.168.1.1",
          govuk_signin_journey_id: "client-session-123",
          extraUserField: "123456",
        },
        event_name: "TODO1",
        client_id: "client-123",
        user_id: "user-123",
        email: "test@example.com",
        extraMiscField: {
          value: 98765,
        },
      }),
    });
  });

  it("should include device information when txmaAuditEncoded is present", async () => {
    mockGetPropsFromAPIGatewayEvent.mockReturnValue({
      sessionId: "session-123",
      persistentSessionId: "persistent-123",
      sourceIp: "192.168.1.1",
      clientSessionId: "client-session-123",
      txmaAuditEncoded: "encoded-device-info",
    });

    const event = {
      event_name: "TODO2" as const,
      client_id: "client-123",
      user_id: "user-123",
      email: "test@example.com",
      restricted: {
        anotherRestrictedField: 123456,
      },
    };

    await sendAuditEvent(event, mockApiGatewayEvent);

    const sentMessage = JSON.parse(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockSendMessage.mock.calls[0]?.[0]?.MessageBody as string,
    ) as { restricted: unknown };

    expect(sentMessage.restricted).toStrictEqual({
      device_information: {
        encoded: "encoded-device-info",
      },
      anotherRestrictedField: 123456,
    });
  });

  it("should use NO_VALUE for missing optional fields", async () => {
    mockGetPropsFromAPIGatewayEvent.mockReturnValue({
      sourceIp: "192.168.1.1",
    });

    const event = {
      event_name: "TODO1" as const,
      client_id: "client-123",
      user_id: "user-123",
      email: "test@example.com",
    };

    await sendAuditEvent(event, mockApiGatewayEvent);

    const sentMessage = JSON.parse(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockSendMessage.mock.calls[0]?.[0]?.MessageBody as string,
    ) as { user: unknown };

    expect(sentMessage.user).toStrictEqual({
      session_id: "NO_VALUE",
      persistent_session_id: "NO_VALUE",
      ip_address: "192.168.1.1",
      govuk_signin_journey_id: "NO_VALUE",
    });
  });

  it("should throw error when AUDIT_EVENTS_QUEUE_URL is not set", async () => {
    delete process.env["AUDIT_EVENTS_QUEUE_URL"];

    const event = {
      event_name: "TODO1" as const,
      client_id: "client-123",
      user_id: "user-123",
      email: "test@example.com",
    };

    await expect(
      sendAuditEvent(event, mockApiGatewayEvent),
      // eslint-disable-next-line vitest/require-to-throw-message
    ).rejects.toThrowError();
  });
});
