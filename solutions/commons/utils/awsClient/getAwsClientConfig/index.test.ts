import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAwsClientConfig } from "./index.js";
import { NodeHttpHandler } from "@smithy/node-http-handler";

const ORIGINAL_ENV = { ...process.env };

describe("getAwsClientConfig", () => {
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

  it("returns defaults and calls helpers with expected args when env vars not set", async () => {
    const result = getAwsClientConfig();

    expect(result.region).toBe("eu-west-2");
    expect(result.maxAttempts).toBe(3);
    expect(result.requestHandler).toBeInstanceOf(NodeHttpHandler);
  });

  it("uses env var values when provided", async () => {
    process.env["AWS_REGION"] = "us-east-1";
    process.env["USE_LOCALSTACK"] = "true";
    process.env["LOCALSTACK_ENDPOINT"] = "http://localstack:4566";
    process.env["LOCALSTACK_ACCESS_KEY_ID"] = "abc";
    process.env["LOCALSTACK_SECRET_ACCESS_KEY"] = "xyz";
    process.env["AWS_MAX_ATTEMPTS"] = "5";
    process.env["AWS_CLIENT_REQUEST_TIMEOUT"] = "2000";
    process.env["AWS_CLIENT_CONNECT_TIMEOUT"] = "3000";

    const result = getAwsClientConfig();

    expect(result.region).toBe("us-east-1");
    expect(result.maxAttempts).toBe(5);
  });
});
