import { describe, it, expect, beforeEach, vi } from "vitest";
import { createKmsClient } from "./index.js";

const ORIGINAL_ENV = { ...process.env };

describe("kmsClient", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env["AWS_REGION"];
    delete process.env["ENVIRONMENT"];
  });

  it("should create a KMS client", () => {
    process.env["AWS_REGION"] = "eu-west-2";
    const client = createKmsClient();

    expect(client).toBeDefined();
    expect(client.client).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.getPublicKey).toBeDefined();
  });

  it("should not use XRAY when in local environment", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["ENVIRONMENT"] = "local";

    const { default: AWSXRay } = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createKmsClient();

    expect(spy).toHaveBeenCalledTimes(0);
  });

  it("should use XRAY when not in local environment", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["ENVIRONMENT"] = "integration";

    const { default: AWSXRay } = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createKmsClient();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should send getPublicKey command correctly", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    const client = createKmsClient();

    const sendSpy = vi
      .spyOn(client.client, "send")
      .mockResolvedValue({} as never);

    await client.getPublicKey({ KeyId: "test-key-id" });

    expect(sendSpy).toHaveBeenCalledTimes(1);
  });
});
