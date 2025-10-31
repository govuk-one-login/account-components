import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@aws-lambda-powertools/parameters/ssm"));
vi.mock(import("../getAwsClientConfig/index.js"));
vi.mock(import("../../getEnvironment/index.js"));
vi.mock(import("aws-xray-sdk"));

const mockSSMProvider = {
  client: { config: { region: "eu-west-2" } },
};

describe("getParametersProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@aws-lambda-powertools/parameters/ssm", () => ({
      SSMProvider: vi.fn(() => mockSSMProvider),
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
