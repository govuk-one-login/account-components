import { describe, it, expect, beforeEach, vi } from "vitest";
import { createS3Client } from "./index.js";

const ORIGINAL_ENV = { ...process.env };

describe("s3Client", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env["AWS_REGION"];
    delete process.env["ENVIRONMENT"];
  });

  it("should create an S3 client", () => {
    process.env["AWS_REGION"] = "eu-west-2";
    const client = createS3Client();

    expect(client).toBeDefined();
    expect(client.client).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.putObject).toBeDefined();
  });

  it("should not use XRAY when in local environment", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["ENVIRONMENT"] = "local";

    const { default: AWSXRay } = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createS3Client();

    expect(spy).toHaveBeenCalledTimes(0);
  });

  it("should use XRAY when not in local environment", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["ENVIRONMENT"] = "integration";

    const { default: AWSXRay } = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createS3Client();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should send putObject command correctly", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    const client = createS3Client();

    const sendSpy = vi
      .spyOn(client.client, "send")
      .mockResolvedValue({} as never);

    await client.putObject({ Bucket: "test-bucket-name", Key: "test-key" });

    expect(sendSpy).toHaveBeenCalledTimes(1);
  });
});
