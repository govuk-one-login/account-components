import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAppConfigClient } from "./index.js";

const ORIGINAL_ENV = { ...process.env };

describe("appconfigClient", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env["AWS_REGION"];
    delete process.env["ENVIRONMENT"];
  });

  it("should create an AppConfig client", () => {
    process.env["AWS_REGION"] = "eu-west-2";
    const client = createAppConfigClient();

    expect(client).toBeDefined();
    expect(client.client).toBeDefined();
    expect(client.config).toBeDefined();
  });

  it("should not use XRAY when in local environment", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["ENVIRONMENT"] = "local";

    const { default: AWSXRay } = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createAppConfigClient();

    expect(spy).toHaveBeenCalledTimes(0);
  });

  it("should use XRAY when not in local environment", async () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["ENVIRONMENT"] = "integration";

    const { default: AWSXRay } = await import("aws-xray-sdk");
    const spy = vi.spyOn(AWSXRay, "captureAWSv3Client");

    createAppConfigClient();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
