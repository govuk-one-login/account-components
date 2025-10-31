import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@aws-sdk/client-appconfigdata"));
vi.mock(import("../getAwsClientConfig/index.js"));
vi.mock(import("../../getEnvironment/index.js"));
vi.mock(import("aws-xray-sdk"));

const mockAppConfigClient = {
  config: { region: "eu-west-2" },
};

describe("getAppConfigClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@aws-sdk/client-appconfigdata", () => ({
      AppConfigDataClient: vi.fn(function () {
        return mockAppConfigClient;
      }),
    }));
    vi.doMock("../getAwsClientConfig/index.js", () => ({
      getAwsClientConfig: vi.fn(() => ({ region: "eu-west-2" })),
    }));
    vi.doMock("../../getEnvironment/index.js", () => ({
      getEnvironment: vi.fn(() => "local"),
    }));
    vi.doMock("aws-xray-sdk", () => ({
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
