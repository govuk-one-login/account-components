import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@aws-sdk/client-s3"));
vi.mock(import("../getAwsClientConfig/index.js"));
vi.mock(import("../../getEnvironment/index.js"));
vi.mock(import("aws-xray-sdk"));

const mockS3Client = {
  config: { region: "eu-west-2" },
  send: vi.fn(),
};

const mockPutObjectCommand = vi.fn();

describe("getS3Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@aws-sdk/client-s3", () => ({
      S3Client: vi.fn(function () {
        return mockS3Client;
      }),
      PutObjectCommand: mockPutObjectCommand,
    }));
    vi.doMock("../getAwsClientConfig/index.js", () => ({
      getAwsClientConfig: vi.fn(() => ({ region: "eu-west-2" })),
    }));
    vi.doMock("../../getEnvironment/index.js", () => ({
      getEnvironment: vi.fn(() => "local"),
    }));
    vi.doMock("aws-xray-sdk", () => ({
      captureAWSv3Client: vi.fn(<T>(client: T): T => client),
    }));
  });

  it("returns cached client on subsequent calls", async () => {
    const { getS3Client } = await import("./index.js");

    const client1 = getS3Client();
    const client2 = getS3Client();

    expect(client1).toBe(client2);
  });

  it("returns client with config and putObject method", async () => {
    const { getS3Client } = await import("./index.js");

    const client = getS3Client();

    expect(client.client).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.putObject).toBeTypeOf("function");
  });

  it("putObject method calls client.send with PutObjectCommand", async () => {
    const { getS3Client } = await import("./index.js");

    const client = getS3Client();
    const params = {
      Bucket: "test-bucket",
      Key: "test-key",
      Body: "test-body",
    };

    await client.putObject(params);

    expect(mockPutObjectCommand).toHaveBeenCalledWith(params);
    expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(Object));
  });
});
