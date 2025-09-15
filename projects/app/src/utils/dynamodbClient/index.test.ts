import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { getDynamoDbClient } from "./index.js";

describe("dynamodbClient", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should create a DynamoDB client", () => {
    const client = getDynamoDbClient();

    expect(client).toBeDefined();
  });

  it("should respect environment variables", async () => {
    process.env = {
      ...originalEnv,
      AWS_REGION: "us-east-1",
      AWS_MAX_ATTEMPTS: "5",
    };

    const client = getDynamoDbClient();

    await expect(client.config.region()).resolves.toBe("us-east-1");
    await expect(client.config.maxAttempts()).resolves.toBe(5);
  });

  it("should use Localstack settings when USE_LOCALSTACK is true", async () => {
    process.env = {
      ...originalEnv,
      USE_LOCALSTACK: "true",
      LOCALSTACK_HOSTNAME: "localstack",
    };

    const client = getDynamoDbClient();

    await expect(
      client.config.endpoint
        ? client.config.endpoint()
        : Promise.resolve("fail"),
    ).resolves.toStrictEqual({
      hostname: "localstack",
      port: 4566,
      protocol: "http:",
      path: "/",
      query: undefined,
    });
  });
});
