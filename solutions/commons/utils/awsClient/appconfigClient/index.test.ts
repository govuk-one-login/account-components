import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAppConfigClient = {
  config: { region: "eu-west-2" },
};

describe("getAppConfigClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // @ts-expect-error
    vi.doMock(import("@aws-sdk/client-appconfigdata"), () => ({
      AppConfigDataClient: vi.fn(function () {
        return mockAppConfigClient;
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

  it("returns cached client on subsequent calls", async () => {
    const { getAppConfigClient } = await import("./index.js");

    const client1 = getAppConfigClient();
    const client2 = getAppConfigClient();

    expect(client1).toBe(client2);
  });

  it("returns client with config", async () => {
    const { getAppConfigClient } = await import("./index.js");

    const client = getAppConfigClient();

    expect(client.client).toBeDefined();
    expect(client.config).toBeDefined();
  });
});
