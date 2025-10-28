import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDynamoDbClient } from "./index.js";

const ORIGINAL_ENV = { ...process.env };

describe("dynamodbClient", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env["AWS_REGION"];
    delete process.env["ENVIRONMENT"];
  });

  it("should create a DynamoDB client", () => {
    process.env["AWS_REGION"] = "eu-west-2";
    const client = createDynamoDbClient();

    expect(client).toBeDefined();
    expect(client.client).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.put).toBeDefined();
    expect(client.get).toBeDefined();
    expect(client.delete).toBeDefined();
    expect(client.update).toBeDefined();
    expect(client.query).toBeDefined();
    expect(client.scan).toBeDefined();
    expect(client.batchWrite).toBeDefined();
    expect(client.batchGet).toBeDefined();
    expect(client.transactWrite).toBeDefined();
  });

  it("should not use XRAY when in local environment", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["ENVIRONMENT"] = "local";

    const { default: AWSXRay } = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createDynamoDbClient();

    expect(spy).toHaveBeenCalledTimes(0);
  });

  it("should use XRAY when not in local environment", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["ENVIRONMENT"] = "integration";

    const { default: AWSXRay } = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createDynamoDbClient();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should send commands correctly", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    const client = createDynamoDbClient();

    const sendSpy = vi
      .spyOn(client.client, "send")
      .mockResolvedValue({} as never);

    await Promise.all([
      client.put({ TableName: "test", Item: {} }),
      client.get({ TableName: "test", Key: {} }),
      client.delete({ TableName: "test", Key: {} }),
      client.update({ TableName: "test", Key: {} }),
      client.query({ TableName: "test" }),
      client.scan({ TableName: "test" }),
      client.batchWrite({ RequestItems: {} }),
      client.batchGet({ RequestItems: {} }),
      client.transactWrite({ TransactItems: [] }),
    ]);

    expect(sendSpy).toHaveBeenCalledTimes(9);
  });
});
