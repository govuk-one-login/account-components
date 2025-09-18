import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAppEnvironment } from "./getAppEnvironment.js";

// We recommend installing an extension to run vitest tests.

const ORIGINAL_ENV = { ...process.env };

describe("getAppEnvironment", () => {
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
    const result = getAppEnvironment();

    expect(result).toStrictEqual({
      awsMaxAttempts: 3,
      awsClientRequestTimeout: 10000,
      awsClientConnectTimeout: 10000,
      region: "eu-west-2",
      useLocalstack: false,
      localstackHost: "http://localhost:4566",
      localstackAccessKeyId: "test",
      // pragma: allowlist nextline secret
      localstackSecretAccessKey: "test",
    });
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

    const result = getAppEnvironment();

    expect(result).toStrictEqual({
      awsMaxAttempts: 5,
      awsClientRequestTimeout: 2000,
      awsClientConnectTimeout: 3000,
      region: "us-east-1",
      useLocalstack: true,
      localstackHost: "http://localstack:4566",
      localstackAccessKeyId: "abc",
      localstackSecretAccessKey: "xyz",
    });
  });
});
