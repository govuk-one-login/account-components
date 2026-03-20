import { beforeEach, describe, expect, it } from "vitest";
import { getAwsClientConfig } from "./index.js";

const ORIGINAL_ENV = { ...process.env };

describe("getAwsClientConfig", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env["AWS_REGION"];
    delete process.env["USE_LOCALSTACK"];
    delete process.env["LOCALSTACK_ENDPOINT"];
    delete process.env["LOCALSTACK_ACCESS_KEY_ID"];
    delete process.env["LOCALSTACK_ACCESS_KEY"];
    delete process.env["AWS_MAX_ATTEMPTS"];
    delete process.env["AWS_CLIENT_CONNECT_TIMEOUT"];
    delete process.env["AWS_CLIENT_REQUEST_TIMEOUT"];
  });

  it("throws error when AWS_REGION is not set", () => {
    expect(() => getAwsClientConfig()).toThrow("AWS_REGION is not set");
  });

  it("returns basic config when AWS_REGION is set", () => {
    process.env["AWS_REGION"] = "eu-west-2";

    const config = getAwsClientConfig();

    expect(config.region).toBe("eu-west-2");
    expect(config.maxAttempts).toBe(3);
    expect(config.requestHandler).toBeDefined();
  });

  it("uses custom max attempts when set", () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["AWS_MAX_ATTEMPTS"] = "5";

    const config = getAwsClientConfig();

    expect(config.maxAttempts).toBe(5);
  });

  it("includes localstack config when USE_LOCALSTACK is true", () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["USE_LOCALSTACK"] = "true";
    process.env["LOCALSTACK_ENDPOINT"] = "http://localhost:4566";
    process.env["LOCAL_KMS_ENDPOINT"] = "http://localhost:4567";
    process.env["LOCALSTACK_ACCESS_KEY_ID"] = "test";
    process.env["LOCALSTACK_ACCESS_KEY"] = "test";

    const config = getAwsClientConfig();

    expect(config.endpoint).toBe("http://localhost:4566");
    expect(config.credentials).toStrictEqual({
      accessKeyId: "test",
      secretAccessKey: "test", // pragma: allowlist secret
    });
  });

  it("throws error when localstack is enabled but endpoint is missing", () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["USE_LOCALSTACK"] = "true";

    expect(() => getAwsClientConfig()).toThrow(
      "LOCALSTACK_ENDPOINT is not set",
    );
  });

  it("throws error when localstack is enabled but access key is missing", () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["USE_LOCALSTACK"] = "true";
    process.env["LOCALSTACK_ENDPOINT"] = "http://localhost:4566";

    expect(() => getAwsClientConfig()).toThrow(
      "LOCALSTACK_ACCESS_KEY_ID is not set",
    );
  });

  it("throws error when localstack is enabled but secret key is missing", () => {
    process.env["AWS_REGION"] = "eu-west-2";
    process.env["USE_LOCALSTACK"] = "true";
    process.env["LOCALSTACK_ENDPOINT"] = "http://localhost:4566";
    process.env["LOCALSTACK_ACCESS_KEY_ID"] = "test";

    expect(() => getAwsClientConfig()).toThrow(
      "LOCALSTACK_ACCESS_KEY is not set",
    );
  });
});
