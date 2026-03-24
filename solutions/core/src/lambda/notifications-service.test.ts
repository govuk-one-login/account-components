import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SQSEvent, SQSRecord } from "aws-lambda";
import * as v from "valibot";

const mockGetSecret = vi.fn();
const mockSendEmail = vi.fn();
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  resetKeys: vi.fn(),
};
const mockMetrics = {
  addMetadata: vi.fn(),
  addMetric: vi.fn(),
  captureColdStartMetric: vi.fn(),
  publishStoredMetrics: vi.fn(),
};

enum MockNotificationType {
  WITH_NEITHER = "WITH_NEITHER",
  WITH_PERSONALISATION = "WITH_PERSONALISATION",
  WITH_SWITCHES = "WITH_SWITCHES",
  WITH_BOTH = "WITH_BOTH",
}

const mockMessageSchema = v.variant("notificationType", [
  v.pipe(
    v.object({
      notificationType: v.literal(MockNotificationType.WITH_NEITHER),
      emailAddress: v.pipe(v.string(), v.email()),
    }),
    v.transform((input) => ({
      emailAddress: input.emailAddress,
      notificationType: input.notificationType,
      personalisation: {},
      optionalContentSwitches: {},
    })),
  ),
  v.pipe(
    v.object({
      notificationType: v.literal(MockNotificationType.WITH_PERSONALISATION),
      emailAddress: v.pipe(v.string(), v.email()),
      name: v.string(),
    }),
    v.transform((input) => ({
      emailAddress: input.emailAddress,
      notificationType: input.notificationType,
      personalisation: { name: input.name },
      optionalContentSwitches: {},
    })),
  ),
  v.pipe(
    v.object({
      notificationType: v.literal(MockNotificationType.WITH_SWITCHES),
      emailAddress: v.pipe(v.string(), v.email()),
      showHeader: v.boolean(),
      showFooter: v.boolean(),
    }),
    v.transform((input) => ({
      emailAddress: input.emailAddress,
      notificationType: input.notificationType,
      personalisation: {},
      optionalContentSwitches: {
        showHeader: input.showHeader,
        showFooter: input.showFooter,
      },
    })),
  ),
  v.pipe(
    v.object({
      notificationType: v.literal(MockNotificationType.WITH_BOTH),
      emailAddress: v.pipe(v.string(), v.email()),
      name: v.string(),
      showHeader: v.boolean(),
    }),
    v.transform((input) => ({
      emailAddress: input.emailAddress,
      notificationType: input.notificationType,
      personalisation: { name: input.name },
      optionalContentSwitches: { showHeader: input.showHeader },
    })),
  ),
]);

vi.mock(import("@aws-lambda-powertools/parameters/secrets"), () => ({
  getSecret: mockGetSecret,
}));

// @ts-expect-error
vi.mock(import("notifications-node-client"), () => ({
  NotifyClient: class {
    sendEmail = mockSendEmail;
  },
}));

// @ts-expect-error
vi.mock(import("../../../commons/utils/logger/index.js"), () => ({
  logger: mockLogger,
}));

// @ts-expect-error
vi.mock(import("../../../commons/utils/metrics/index.js"), () => ({
  metrics: mockMetrics,
}));

// @ts-expect-error
vi.mock(import("../../../commons/utils/notifications/index.js"), () => ({
  messageSchema: mockMessageSchema,
  NotificationType: MockNotificationType,
  sendNotification: vi.fn(),
}));

const createSQSRecord = (
  body: string,
  messageId = "test-message-id",
): SQSRecord =>
  ({
    messageId,
    body,
    receiptHandle: "test-receipt-handle",
    attributes: {
      ApproximateReceiveCount: "1",
      SentTimestamp: "1234567890",
      SenderId: "test-sender",
      ApproximateFirstReceiveTimestamp: "1234567890",
    },
    messageAttributes: {},
    md5OfBody: "test-md5",
    eventSource: "aws:sqs",
    eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:test-queue",
    awsRegion: "us-east-1",
  }) as SQSRecord;

const createSQSEvent = (records: SQSRecord[]): SQSEvent => ({
  Records: records,
});

describe("notifications-service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetSecret.mockResolvedValue("test-api-key");
    process.env["NOTIFY_API_KEY_SECRET_ARN"] =
      "arn:aws:secretsmanager:us-east-1:123456789012:secret:test";
    process.env["NOTIFY_TEMPLATE_IDS"] = JSON.stringify({
      WITH_NEITHER: "template-neither",
      WITH_PERSONALISATION: "template-personalisation",
      WITH_SWITCHES: "template-switches",
      WITH_BOTH: "template-both",
    });
  });

  it("successfully processes notification with no personalisation or optionalContentSwitches", async () => {
    const { handler } = await import("./notifications-service.js");

    mockSendEmail.mockResolvedValue({
      data: { id: "notify-id-000", reference: "ref-000" },
    });

    const message = {
      emailAddress: "test@example.com",
      notificationType: "WITH_NEITHER",
    };

    const event = createSQSEvent([createSQSRecord(JSON.stringify(message))]);
    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockSendEmail).toHaveBeenCalledWith(
      "template-neither",
      "test@example.com",
      expect.objectContaining({
        personalisation: {},
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        reference: expect.any(String),
      }),
    );
  });

  it("successfully processes valid notification message with personalisation", async () => {
    const { handler } = await import("./notifications-service.js");

    mockSendEmail.mockResolvedValue({
      data: {
        id: "notify-id-123",
        reference: "ref-123",
      },
    });

    const message = {
      emailAddress: "test@example.com",
      notificationType: "WITH_PERSONALISATION",
      name: "Test User",
    };

    const event = createSQSEvent([createSQSRecord(JSON.stringify(message))]);
    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockSendEmail).toHaveBeenCalledWith(
      "template-personalisation",
      "test@example.com",
      expect.objectContaining({
        personalisation: { name: "Test User" },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        reference: expect.any(String),
      }),
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      "notification_sent",
      expect.objectContaining({
        messageId: "test-message-id",
        id: "notify-id-123",
        notificationType: "WITH_PERSONALISATION",
      }),
    );
  });

  it("adds to batch failures for invalid message format", async () => {
    const { handler } = await import("./notifications-service.js");

    const event = createSQSEvent([createSQSRecord("invalid-json")]);
    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0]?.itemIdentifier).toBe("test-message-id");
    expect(mockLogger.error).toHaveBeenCalledWith(
      "invalid_message_format",
      expect.any(Object),
    );
    expect(mockSendEmail).not.toHaveBeenCalledWith();
  });

  it("merges optionalContentSwitches into personalisation as yes/no strings", async () => {
    const { handler } = await import("./notifications-service.js");

    mockSendEmail.mockResolvedValue({
      data: {
        id: "notify-id-456",
        reference: "ref-456",
      },
    });

    const message = {
      emailAddress: "test@example.com",
      notificationType: "WITH_SWITCHES",
      showHeader: true,
      showFooter: false,
    };

    const event = createSQSEvent([createSQSRecord(JSON.stringify(message))]);
    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockSendEmail).toHaveBeenCalledWith(
      "template-switches",
      "test@example.com",
      expect.objectContaining({
        personalisation: {
          showHeader: "yes",
          showFooter: "no",
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        reference: expect.any(String),
      }),
    );
  });

  it("merges personalisation and optionalContentSwitches together", async () => {
    const { handler } = await import("./notifications-service.js");

    mockSendEmail.mockResolvedValue({
      data: { id: "notify-id-789", reference: "ref-789" },
    });

    const message = {
      emailAddress: "test@example.com",
      notificationType: "WITH_BOTH",
      name: "Test User",
      showHeader: true,
    };

    const event = createSQSEvent([createSQSRecord(JSON.stringify(message))]);
    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockSendEmail).toHaveBeenCalledWith(
      "template-both",
      "test@example.com",
      expect.objectContaining({
        personalisation: {
          name: "Test User",
          showHeader: "yes",
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        reference: expect.any(String),
      }),
    );
  });

  it("adds to batch failures when template ID not found", async () => {
    vi.resetModules();
    process.env["NOTIFY_TEMPLATE_IDS"] = JSON.stringify({});

    const { handler } = await import("./notifications-service.js");

    const message = {
      emailAddress: "test@example.com",
      notificationType: "WITH_PERSONALISATION",
      name: "Test User",
    };

    const event = createSQSEvent([createSQSRecord(JSON.stringify(message))]);
    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "template_id_not_found",
      expect.objectContaining({
        notificationType: "WITH_PERSONALISATION",
      }),
    );
    expect(mockSendEmail).not.toHaveBeenCalledWith();
  });

  it("handles axios error when sending notification", async () => {
    const { handler } = await import("./notifications-service.js");

    const axiosError = {
      isAxiosError: true,
      response: {
        status: 400,
        statusText: "Bad Request",
        data: { error: "Invalid template" },
      },
    };
    mockSendEmail.mockRejectedValue(axiosError);

    const message = {
      emailAddress: "test@example.com",
      notificationType: "WITH_PERSONALISATION",
      name: "Test User",
    };

    const event = createSQSEvent([createSQSRecord(JSON.stringify(message))]);
    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "unable_to_send_notification",
      expect.objectContaining({
        status: 400,
        statusText: "Bad Request",
      }),
    );
    expect(mockSendEmail).not.toHaveBeenCalledWith();
  });

  it("handles non-axios error when sending notification", async () => {
    const { handler } = await import("./notifications-service.js");

    mockSendEmail.mockRejectedValue(new Error("Network failure"));

    const message = {
      emailAddress: "test@example.com",
      notificationType: "WITH_PERSONALISATION",
      name: "Test User",
    };

    const event = createSQSEvent([createSQSRecord(JSON.stringify(message))]);
    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "unable_to_send_notification_due_to_an_unknown_error",
      expect.objectContaining({
        details: "Network failure",
      }),
    );
    expect(mockSendEmail).not.toHaveBeenCalledWith();
  });

  it("adds to batch failures for invalid result format", async () => {
    const { handler } = await import("./notifications-service.js");

    mockSendEmail.mockResolvedValue({ invalid: "response" });

    const message = {
      emailAddress: "test@example.com",
      notificationType: "WITH_PERSONALISATION",
      name: "Test User",
    };

    const event = createSQSEvent([createSQSRecord(JSON.stringify(message))]);
    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "invalid_result_format",
      expect.any(Object),
    );
    expect(mockSendEmail).not.toHaveBeenCalledWith();
  });

  it("processes multiple records and returns partial failures", async () => {
    const { handler } = await import("./notifications-service.js");

    mockSendEmail
      .mockResolvedValueOnce({
        data: { id: "notify-1", reference: "ref-1" },
      })
      .mockRejectedValueOnce(new Error("Failed"));

    const message1 = {
      emailAddress: "test1@example.com",
      notificationType: "WITH_PERSONALISATION",
      name: "User One",
    };
    const message2 = {
      emailAddress: "test2@example.com",
      notificationType: "WITH_SWITCHES",
      showHeader: true,
      showFooter: false,
    };

    const event = createSQSEvent([
      createSQSRecord(JSON.stringify(message1), "msg-1"),
      createSQSRecord(JSON.stringify(message2), "msg-2"),
    ]);
    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0]?.itemIdentifier).toBe("msg-2");

    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      "notification_sent",
      expect.objectContaining({
        messageId: "msg-1",
        id: "notify-1",
        notificationType: "WITH_PERSONALISATION",
        reference: "ref-1",
      }),
    );
  });

  it("calls metrics and logger cleanup methods", async () => {
    const { handler } = await import("./notifications-service.js");

    mockSendEmail.mockResolvedValue({
      data: { id: "notify-id", reference: "ref" },
    });

    const message = {
      emailAddress: "test@example.com",
      notificationType: "WITH_PERSONALISATION",
      name: "Test User",
    };

    const event = createSQSEvent([createSQSRecord(JSON.stringify(message))]);
    await handler(event);

    expect(mockLogger.resetKeys).toHaveBeenCalledWith();
    expect(mockMetrics.captureColdStartMetric).toHaveBeenCalledWith();
    expect(mockMetrics.publishStoredMetrics).toHaveBeenCalledWith();
  });

  it("throws error when NOTIFY_API_KEY_SECRET_ARN is undefined", async () => {
    delete process.env["NOTIFY_API_KEY_SECRET_ARN"];

    await expect(async () => {
      await import("./notifications-service.js");
    }).rejects.toThrow(
      JSON.stringify({
        msg: "env_var_NOTIFY_API_KEY_SECRET_ARN_is_undefined",
      }),
    );
  });

  it("throws error when getSecret fails", async () => {
    mockGetSecret.mockRejectedValue(new Error("Secret fetch failed"));

    await expect(async () => {
      await import("./notifications-service.js");
    }).rejects.toThrow("error_getting_notify_api_key_secret");
  });

  it("throws error when notify API key is undefined", async () => {
    mockGetSecret.mockResolvedValue(undefined);

    await expect(async () => {
      await import("./notifications-service.js");
    }).rejects.toThrow(
      JSON.stringify({
        msg: "notify_api_key_is_undefined",
        notifyApiKeySecretArn:
          "arn:aws:secretsmanager:us-east-1:123456789012:secret:test",
      }),
    );
  });

  it("throws error when notify API key is not a string", async () => {
    mockGetSecret.mockResolvedValue(12345);

    await expect(async () => {
      await import("./notifications-service.js");
    }).rejects.toThrow(
      JSON.stringify({
        msg: "notify_api_key_is_not_a_string",
        notifyApiKeySecretArn:
          "arn:aws:secretsmanager:us-east-1:123456789012:secret:test",
      }),
    );
  });

  it("throws error when NOTIFY_TEMPLATE_IDS is invalid", async () => {
    process.env["NOTIFY_TEMPLATE_IDS"] = "invalid-json";

    await expect(async () => {
      await import("./notifications-service.js");
    }).rejects.toThrow("invalid_template_ids_format");
  });
});
