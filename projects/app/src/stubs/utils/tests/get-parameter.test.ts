import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.doMock("@aws-lambda-powertools/parameters/ssm", () => {
  const mockGet = vi.fn((name: string) => {
    if (name === "valid-param") return Promise.resolve("mocked-value");
    return Promise.resolve(undefined);
  });

  return {
    SSMProvider: vi.fn().mockImplementation(() => ({
      get: mockGet,
    })),
  };
});

let getLocalParameter: (name: string) => Promise<string>;
let isLocalhost: () => boolean;

describe("getLocalParameter", () => {
  beforeEach(async () => {
    delete process.env["AWS_SSM_ENDPOINT"];
    const mod = await import("../get-parameter.js");
    getLocalParameter = mod.getLocalParameter;
    isLocalhost = mod.isLocalhost;
  });

  it("returns mocked SSM value", async () => {
    const result = await getLocalParameter("valid-param");

    expect(result).toBe("mocked-value");
  });

  it("throws when SSM parameter is missing", async () => {
    await expect(getLocalParameter("missing-param")).rejects.toThrow(
      "SSM parameter missing-param not found",
    );
  });

  it("isLocalhost returns true for localhost", () => {
    process.env["AWS_SSM_ENDPOINT"] = "http://localhost:4566";

    expect(isLocalhost()).toBe(true);
  });

  it("isLocalhost returns false for non-localhost", () => {
    process.env["AWS_SSM_ENDPOINT"] = "https://ssm.eu-west-2.amazonaws.com";

    expect(isLocalhost()).toBe(false);
  });
});

describe("isLocalhost", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return true if AWS_SSM_ENDPOINT contains 'localhost'", () => {
    process.env["AWS_SSM_ENDPOINT"] = "http://localhost:4566";

    expect(isLocalhost()).toBe(true);
  });

  it("should return false if AWS_SSM_ENDPOINT does not contain 'localhost'", () => {
    process.env["AWS_SSM_ENDPOINT"] = "https://ssm.eu-west-2.amazonaws.com";

    expect(isLocalhost()).toBe(false);
  });

  it("should return undefined if AWS_SSM_ENDPOINT is not set", () => {
    delete process.env["AWS_SSM_ENDPOINT"];

    expect(isLocalhost()).toBeUndefined();
  });
});
