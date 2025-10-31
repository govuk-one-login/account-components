import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDynamoDbClient,
  getSqsClient,
  getKmsClient,
  getParametersProvider,
  getAppConfigClient,
  getS3Client,
} from "./index.js";

const ORIGINAL_ENV = { ...process.env };

// @ts-expect-error
vi.mock(import("./dynamodbClient/index.js"), () => ({
  createDynamoDbClient: vi.fn(() => ({ client: "dynamodb" })),
}));

// @ts-expect-error
vi.mock(import("./sqsClient/index.js"), () => ({
  createSqsClient: vi.fn(() => ({ client: "sqs" })),
}));

// @ts-expect-error
vi.mock(import("./kmsClient/index.js"), () => ({
  createKmsClient: vi.fn(() => ({ client: "kms" })),
}));

// @ts-expect-error
vi.mock(import("./s3Client/index.js"), () => ({
  createS3Client: vi.fn(() => ({ client: "s3" })),
}));

// @ts-expect-error
vi.mock(import("./appconfigClient/index.js"), () => ({
  createAppConfigClient: vi.fn(() => ({ client: "appconfig" })),
}));

// @ts-expect-error
vi.mock(import("@aws-lambda-powertools/parameters/ssm"), () => ({
  SSMProvider: vi.fn().mockImplementation(function () {
    return { provider: "ssm" };
  }),
}));

vi.mock(import("./getAwsClientConfig/index.js"));

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
    expect(client1).toStrictEqual({ client: "dynamodb" });
  });

  it("should return cached SQS client on subsequent calls", async () => {
    const client1 = await getSqsClient();
    const client2 = await getSqsClient();

    expect(client1).toBe(client2);
    expect(client1).toStrictEqual({ client: "sqs" });
  });

  it("should return cached KMS client on subsequent calls", async () => {
    const client1 = await getKmsClient();
    const client2 = await getKmsClient();

    expect(client1).toBe(client2);
    expect(client1).toStrictEqual({ client: "kms" });
  });

  it("should return cached S3 client on subsequent calls", async () => {
    const client1 = await getS3Client();
    const client2 = await getS3Client();

    expect(client1).toBe(client2);
    expect(client1).toStrictEqual({ client: "s3" });
  });

  it("should return cached parameters provider on subsequent calls", async () => {
    const provider1 = await getParametersProvider();
    const provider2 = await getParametersProvider();

    expect(provider1).toBe(provider2);
    expect(provider1).toStrictEqual({ provider: "ssm" });
  });

  it("should return cached AppConfig client on subsequent calls", async () => {
    const client1 = await getAppConfigClient();
    const client2 = await getAppConfigClient();

    expect(client1).toBe(client2);
    expect(client1).toStrictEqual({ client: "appconfig" });
  });
});
