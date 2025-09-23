import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDynamoDbClient } from "./dynamodbClient.js";

const ORIGINAL_ENV = { ...process.env };

describe("dynamodbClient", () => {
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

  it("should create a DynamoDB client", () => {
    const client = createDynamoDbClient();

    expect(client).toBeDefined();
  });

  it("should respect environment variables", async () => {
    process.env["AWS_REGION"] = "us-east-1";
    process.env["AWS_MAX_ATTEMPTS"] = "5";

    const client = createDynamoDbClient();

    await expect(client.config.region()).resolves.toBe("us-east-1");
    await expect(client.config.maxAttempts()).resolves.toBe(5);
  });

  it("should use Localstack settings when USE_LOCALSTACK is true", async () => {
    process.env["USE_LOCALSTACK"] = "true";
    process.env["LOCALSTACK_ENDPOINT"] = "https://test:1234";

    const client = createDynamoDbClient();

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
