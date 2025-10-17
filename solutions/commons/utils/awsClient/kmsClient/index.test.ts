import { describe, it, expect, beforeEach, vi } from "vitest";
import { createKmsClient } from "./index.js";

vi.mock(import("aws-xray-sdk"), () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  captureAWSv3Client: vi.fn((client) => client),
}));

const ORIGINAL_ENV = { ...process.env };

describe("kmsClient", () => {
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

  it("should create a KMS client", () => {
    const client = createKmsClient();

    expect(client).toBeDefined();
    expect(client.kmsClient).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.getPublicKey).toBeDefined();
  });

  it("should respect environment variables", async () => {
    process.env["AWS_REGION"] = "us-east-1";
    process.env["AWS_MAX_ATTEMPTS"] = "5";

    const client = createKmsClient();

    await expect(client.config.region()).resolves.toBe("us-east-1");
    await expect(client.config.maxAttempts()).resolves.toBe(5);
  });

  it("should not use XRAY when in local environment", async () => {
    process.env["ENVIRONMENT"] = "local";

    const AWSXRay = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createKmsClient();

    expect(spy).toHaveBeenCalledTimes(0);
  });

  it("should use XRAY when not in local environment", async () => {
    process.env["ENVIRONMENT"] = "integration";

    const AWSXRay = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createKmsClient();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should call getPublicKey correctly", async () => {
    const client = createKmsClient();
    const sendSpy = vi
      .spyOn(client.kmsClient, "send")
      .mockResolvedValue({} as never);

    await client.getPublicKey({ KeyId: "test-key-id" });

    expect(sendSpy).toHaveBeenCalledTimes(1);
  });
});
