import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendNotification, NotificationType } from "./index.js";

const mockSendMessage = vi.fn();

// @ts-expect-error
vi.mock(import("../awsClient/sqsClient/index.js"), () => ({
  getSqsClient: vi.fn(() => ({
    sendMessage: mockSendMessage,
  })),
}));

describe("sendNotification", () => {
  const originalEnv = process.env["NOTIFICATIONS_QUEUE_URL"];

  beforeEach(() => {
    process.env["NOTIFICATIONS_QUEUE_URL"] =
      "https://sqs.eu-west-2.amazonaws.com/123456789012/test-queue";
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env["NOTIFICATIONS_QUEUE_URL"] = originalEnv;
  });

  it("should send message to SQS queue", async () => {
    const message = {
      emailAddress: "test@example.com",
      notificationType: NotificationType.TODO,
      personalisation: {},
    };

    await sendNotification(message);

    expect(mockSendMessage).toHaveBeenCalledWith({
      QueueUrl: "https://sqs.eu-west-2.amazonaws.com/123456789012/test-queue",
      MessageBody: JSON.stringify(message),
    });
  });

  it("should throw error when NOTIFICATIONS_QUEUE_URL is not set", async () => {
    delete process.env["NOTIFICATIONS_QUEUE_URL"];

    const message = {
      emailAddress: "test@example.com",
      notificationType: NotificationType.TODO,
      personalisation: {},
    };

    // eslint-disable-next-line vitest/require-to-throw-message
    await expect(sendNotification(message)).rejects.toThrowError();
  });
});
