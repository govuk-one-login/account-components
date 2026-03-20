import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSSMProvider = {
  client: { config: { region: "eu-west-2" } },
};

describe("getParametersProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // @ts-expect-error
    vi.doMock(import("@aws-lambda-powertools/parameters/ssm"), () => ({
      SSMProvider: vi.fn(function () {
        return mockSSMProvider;
      }),
    }));
    // @ts-expect-error
    vi.doMock(import("../getAwsClientConfig/index.js"), () => ({
      getAwsClientConfig: vi.fn(() => ({ region: "eu-west-2" })),
    }));
    // @ts-expect-error
    vi.doMock(import("../../getEnvironment/index.js"), () => ({
      getEnvironment: vi.fn(() => "local"),
    }));
    // @ts-expect-error
    vi.doMock(import("aws-xray-sdk"), () => ({
      captureAWSv3Client: vi.fn(<T>(client: T): T => client),
    }));
  });

  it("returns cached provider on subsequent calls", async () => {
    const { getParametersProvider } = await import("./index.js");

    const provider1 = getParametersProvider();
    const provider2 = getParametersProvider();

    expect(provider1).toBe(provider2);
  });

  it("returns SSMProvider instance", async () => {
    const { getParametersProvider } = await import("./index.js");

    const provider = getParametersProvider();

    expect(provider).toBeDefined();
    expect(provider.client).toBeDefined();
  });
});
