import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSqsClient } from "./sqsClient.js";

const ORIGINAL_ENV = { ...process.env };

describe("sqsClient", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env["AWS_REGION"];
    delete process.env["LOCALSTACK_ENDPOINT"];
    delete process.env["LOCALSTACK_ACCESS_KEY_ID"];
    delete process.env["LOCALSTACK_SECRET_ACCESS_KEY"];
    delete process.env["AWS_MAX_ATTEMPTS"];
    delete process.env["AWS_CLIENT_REQUEST_TIMEOUT"];
    delete process.env["AWS_CLIENT_CONNECT_TIMEOUT"];
  });

  it("should create an SQS client", () => {
    const client = createSqsClient();

    expect(client).toBeDefined();
  });

  it("should use Localstack settings when USE_LOCALSTACK is true", async () => {
    process.env["USE_LOCALSTACK"] = "true";
    process.env["LOCALSTACK_ENDPOINT"] = "https://test:1234";
    const client = createSqsClient();

    await expect(
      client.config.endpoint
        ? client.config.endpoint()
        : Promise.resolve("fail"),
    ).resolves.toStrictEqual({
      hostname: "test",
      port: 1234,
      protocol: "https:",
      path: "/",
      query: undefined,
    });
  });

  it("should sendMessages correctly", async () => {
    const client = createSqsClient();
    const sendSpy = vi
      .spyOn(client.sqsClient, "send")
      .mockResolvedValue({ MessageId: "12345" } as never);

    const result = await client.sendMessage({
      QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/MyQueue",
      MessageBody: "Hello, world!",
    });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(result.MessageId).toBe("12345");
  });

  it("should receiveMessages correctly", async () => {
    const client = createSqsClient();
    const sendSpy = vi.spyOn(client.sqsClient, "send").mockResolvedValue({
      Messages: [
        {
          MessageId: "12345",
          ReceiptHandle: "abcde",
          Body: "Hello, world!",
        },
      ],
    } as never);

    const result = await client.receiveMessage({
      QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/MyQueue",
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 0,
    });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(result.Messages).toHaveLength(1);
  });

  it("should deleteMessage correctly", async () => {
    const client = createSqsClient();
    const sendSpy = vi
      .spyOn(client.sqsClient, "send")
      .mockResolvedValue({} as never);

    await client.deleteMessage({
      QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/MyQueue",
      ReceiptHandle: "abcde",
    });

    expect(sendSpy).toHaveBeenCalledTimes(1);
  });
});
