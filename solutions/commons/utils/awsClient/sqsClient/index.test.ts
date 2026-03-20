import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSqsClient = {
  config: { region: "eu-west-2" },
  send: vi.fn(),
};

const mockCommands = {
  SendMessageCommand: vi.fn(),
  ReceiveMessageCommand: vi.fn(),
  DeleteMessageCommand: vi.fn(),
};

describe("getSqsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // @ts-expect-error
    vi.doMock(import("@aws-sdk/client-sqs"), () => ({
      SQSClient: vi.fn(function () {
        return mockSqsClient;
      }),
      SendMessageCommand: mockCommands.SendMessageCommand,
      ReceiveMessageCommand: mockCommands.ReceiveMessageCommand,
      DeleteMessageCommand: mockCommands.DeleteMessageCommand,
    }));
    // @ts-expect-error
    vi.doMock(import("../getAwsClientConfig/index.js"), () => ({
      getAwsClientConfig: vi.fn(() => ({ region: "eu-west-2" })),
    }));
    // @ts-expect-error
    vi.doMock(import("../../getEnvironment/index.js"), () => ({
      getEnvironment: vi.fn(() => "local"),
    }));
    // @ts-expect-error
    vi.doMock(import("aws-xray-sdk"), () => ({
      captureAWSv3Client: vi.fn(<T>(client: T): T => client),
    }));
  });

  it("returns cached client on subsequent calls", async () => {
    const { getSqsClient } = await import("./index.js");

    const client1 = getSqsClient();
    const client2 = getSqsClient();

    expect(client1).toBe(client2);
  });

  it("returns client with all methods", async () => {
    const { getSqsClient } = await import("./index.js");

    const client = getSqsClient();

    expect(client.client).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.sendMessage).toBeTypeOf("function");
    expect(client.receiveMessage).toBeTypeOf("function");
    expect(client.deleteMessage).toBeTypeOf("function");
  });

  it("sendMessage method calls client.send with SendMessageCommand", async () => {
    const { getSqsClient } = await import("./index.js");

    const client = getSqsClient();
    const params = { QueueUrl: "test-queue-url", MessageBody: "test-message" };

    await client.sendMessage(params);

    expect(mockCommands.SendMessageCommand).toHaveBeenCalledWith(params);
    expect(mockSqsClient.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it("receiveMessage method calls client.send with ReceiveMessageCommand", async () => {
    const { getSqsClient } = await import("./index.js");

    const client = getSqsClient();
    const params = { QueueUrl: "test-queue-url", MaxNumberOfMessages: 10 };

    await client.receiveMessage(params);

    expect(mockCommands.ReceiveMessageCommand).toHaveBeenCalledWith(params);
    expect(mockSqsClient.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it("deleteMessage method calls client.send with DeleteMessageCommand", async () => {
    const { getSqsClient } = await import("./index.js");

    const client = getSqsClient();
    const params = {
      QueueUrl: "test-queue-url",
      ReceiptHandle: "test-receipt-handle",
    };

    await client.deleteMessage(params);

    expect(mockCommands.DeleteMessageCommand).toHaveBeenCalledWith(params);
    expect(mockSqsClient.send).toHaveBeenCalledWith(expect.any(Object));
  });
});
