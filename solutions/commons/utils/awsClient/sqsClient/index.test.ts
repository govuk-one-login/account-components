import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSqsClient } from "./index.js";

const ORIGINAL_ENV = { ...process.env };

describe("sqsClient", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env["AWS_REGION"];
    delete process.env["ENVIRONMENT"];
  });

  it("should create an SQS client", () => {
    process.env["AWS_REGION"] = "eu-west-2";
    const client = createSqsClient();

    expect(client).toBeDefined();
    expect(client.client).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.sendMessage).toBeDefined();
    expect(client.receiveMessage).toBeDefined();
    expect(client.deleteMessage).toBeDefined();
  });

  it("should not use XRAY when in local environment", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["ENVIRONMENT"] = "local";

    const { default: AWSXRay } = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createSqsClient();

    expect(spy).toHaveBeenCalledTimes(0);
  });

  it("should use XRAY when not in local environment", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["ENVIRONMENT"] = "integration";

    const { default: AWSXRay } = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createSqsClient();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should send commands correctly", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    const client = createSqsClient();

    const sendSpy = vi
      .spyOn(client.client, "send")
      .mockResolvedValue({} as never);

    await Promise.all([
      client.sendMessage({ QueueUrl: "test", MessageBody: "test" }),
      client.receiveMessage({ QueueUrl: "test" }),
      client.deleteMessage({ QueueUrl: "test", ReceiptHandle: "test" }),
    ]);

    expect(sendSpy).toHaveBeenCalledTimes(3);
  });
});
