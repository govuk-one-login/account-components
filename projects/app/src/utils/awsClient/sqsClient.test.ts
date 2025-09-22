import { describe, it, expect } from "vitest";
import { createSqsClient } from "./sqsClient.js";

describe("sqsClient", () => {
  it("should create an SQS client", () => {
    const client = createSqsClient({
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

  it("should use Localstack settings when USE_LOCALSTACK is true", async () => {
    const client = createSqsClient({
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
