import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDynamoDbClient,
  getSqsClient,
  getKmsClient,
  getParametersProvider,
  getAppConfigClient,
} from "./index.js";

const ORIGINAL_ENV = { ...process.env };

vi.mock("./dynamodbClient/index.js", () => ({
  createDynamoDbClient: vi.fn(() => ({ client: "dynamodb" })),
}));

vi.mock("./sqsClient/index.js", () => ({
  createSqsClient: vi.fn(() => ({ client: "sqs" })),
}));

vi.mock("./kmsClient/index.js", () => ({
  createKmsClient: vi.fn(() => ({ client: "kms" })),
}));

vi.mock("./appconfigClient/index.js", () => ({
  createAppConfigClient: vi.fn(() => ({ client: "appconfig" })),
}));

vi.mock("@aws-lambda-powertools/parameters/ssm", () => ({
  SSMProvider: vi.fn(() => ({ provider: "ssm" })),
}));

vi.mock("./getAwsClientConfig/index.js");

describe("awsClient", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    process.env["AWS_REGION"] = "eu-west-2";
  });

  it("should return cached DynamoDB client on subsequent calls", async () => {
    const client1 = await getDynamoDbClient();
    const client2 = await getDynamoDbClient();

    expect(client1).toBe(client2);
    expect(client1).toEqual({ client: "dynamodb" });
  });

  it("should return cached SQS client on subsequent calls", async () => {
    const client1 = await getSqsClient();
    const client2 = await getSqsClient();

    expect(client1).toBe(client2);
    expect(client1).toEqual({ client: "sqs" });
  });

  it("should return cached KMS client on subsequent calls", async () => {
    const client1 = await getKmsClient();
    const client2 = await getKmsClient();

    expect(client1).toBe(client2);
    expect(client1).toEqual({ client: "kms" });
  });

  it("should return cached parameters provider on subsequent calls", async () => {
    const provider1 = await getParametersProvider();
    const provider2 = await getParametersProvider();

    expect(provider1).toBe(provider2);
    expect(provider1).toEqual({ provider: "ssm" });
  });

  it("should return cached AppConfig client on subsequent calls", async () => {
    const client1 = await getAppConfigClient();
    const client2 = await getAppConfigClient();

    expect(client1).toBe(client2);
    expect(client1).toEqual({ client: "appconfig" });
  });
});
