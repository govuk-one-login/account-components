import { describe, it, expect } from "vitest";
import { createDynamoDbClient } from "./dynamodbClient.js";

describe("dynamodbClient", () => {
  it("should create a DynamoDB client", () => {
    const client = createDynamoDbClient({
      region: "us-east-1",
      awsMaxAttempts: 5,
      awsClientRequestTimeout: 10000,
      awsClientConnectTimeout: 10000,
      useLocalstack: false,
      localstackHost: "http://localhost:4566",
      localstackAccessKeyId: "test",
      // pragma: allowlist nextline secret
      localstackSecretAccessKey: "test",
    });

    expect(client).toBeDefined();
  });

  it("should respect environment variables", async () => {
    const client = createDynamoDbClient({
      region: "us-east-1",
      awsMaxAttempts: 5,
      awsClientRequestTimeout: 10000,
      awsClientConnectTimeout: 10000,
      useLocalstack: false,
      localstackHost: "http://localhost:4566",
      localstackAccessKeyId: "test",
      // pragma: allowlist nextline secret
      localstackSecretAccessKey: "test",
    });

    await expect(client.config.region()).resolves.toBe("us-east-1");
    await expect(client.config.maxAttempts()).resolves.toBe(5);
  });

  it("should use Localstack settings when USE_LOCALSTACK is true", async () => {
    const client = createDynamoDbClient({
      region: "us-east-1",
      awsMaxAttempts: 5,
      awsClientRequestTimeout: 10000,
      awsClientConnectTimeout: 10000,
      useLocalstack: true,
      localstackHost: "https://test:1234",
      localstackAccessKeyId: "test",
      // pragma: allowlist nextline secret
      localstackSecretAccessKey: "test",
    });

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
});
