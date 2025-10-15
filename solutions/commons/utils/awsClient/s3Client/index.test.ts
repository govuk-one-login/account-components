import { describe, it, expect, beforeEach, vi } from "vitest";
import { createS3Client } from "./index.js";

vi.mock(import("aws-xray-sdk"), () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  captureAWSv3Client: vi.fn((client) => client),
}));

const ORIGINAL_ENV = { ...process.env };

describe("s3Client", () => {
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

  it("should create a S3 client", () => {
    const client = createS3Client();

    expect(client).toBeDefined();
    expect(client.s3Client).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.putObject).toBeDefined();
  });

  it("should respect environment variables", async () => {
    process.env["AWS_REGION"] = "us-east-1";
    process.env["AWS_MAX_ATTEMPTS"] = "5";

    const client = createS3Client();

    await expect(client.config.region()).resolves.toBe("us-east-1");
    await expect(client.config.maxAttempts()).resolves.toBe(5);
  });

  it("should not use XRAY when in local environment", async () => {
    process.env["ENVIRONMENT"] = "local";

    const AWSXRay = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createS3Client();

    expect(spy).toHaveBeenCalledTimes(0);
  });

  it("should use XRAY when not in local environment", async () => {
    process.env["ENVIRONMENT"] = "integration";

    const AWSXRay = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createS3Client();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should call putObject", async () => {
    const client = createS3Client();
    const sendSpy = vi
      .spyOn(client.s3Client, "send")
      .mockResolvedValue({} as never);

    await client.putObject({
      Bucket: "test-bucket",
      Key: "test-key",
      Body: '{"data":"test"}',
      ContentType: "application/json",
    });

    expect(sendSpy).toHaveBeenCalledTimes(1);
  });
});
