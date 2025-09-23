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
    delete process.env["ENVIRONMENT"];
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

  it("should not use XRAY when in local environment", async () => {
    process.env["ENVIRONMENT"] = "local";

    const { default: AWSXRay } = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createDynamoDbClient();

    expect(spy).toHaveBeenCalledTimes(0);
  });

  it("should use XRAY when not in local environment", async () => {
    process.env["ENVIRONMENT"] = "integration";

    const { default: AWSXRay } = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createDynamoDbClient();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should send commands correctly", async () => {
    const client = createDynamoDbClient();

    type DynamoMethodName = Extract<
      keyof typeof client,
      | "put"
      | "get"
      | "update"
      | "delete"
      | "query"
      | "scan"
      | "batchWrite"
      | "batchGet"
      | "transactWrite"
      | "send"
    >;

    const methodNames: DynamoMethodName[] = [
      "put",
      "get",
      "update",
      "delete",
      "query",
      "scan",
      "batchWrite",
      "batchGet",
      "transactWrite",
      "send",
    ];

    const sendSpy = vi
      .spyOn(client.docClient, "send")
      .mockResolvedValue({} as never);

    await Promise.all(
      methodNames.map((methodName) => {
        return client[methodName]({} as never);
      }),
    );

    expect(sendSpy).toHaveBeenCalledTimes(methodNames.length);
  });
});
