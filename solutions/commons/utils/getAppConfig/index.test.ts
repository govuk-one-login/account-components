import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConfig = {
  client_registry: [
    {
      client_id: "test-client-id",
      scope: "account-delete",
      redirect_uris: ["http://localhost:6003/callback"],
      client_name: "Test Client",
      jwks_uri: "http://localhost:6003/.well-known/jwks.json",
    },
  ],
  jti_nonce_ttl_in_seconds: 7200,
  auth_code_ttl: 300,
};

describe("getAppConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns appconfig data", async () => {
    const mockGet = vi.fn().mockResolvedValue(mockConfig);
    const mockAppConfigProvider = vi.fn().mockImplementation(() => ({
      get: mockGet,
    }));
    const mockGetAppConfigClient = vi.fn().mockReturnValue({
      client: {},
      config: {},
    });

    // @ts-expect-error
    vi.doMock(import("../getEnvironment/index.js"), () => ({
      getEnvironment: vi.fn(() => "dev"),
    }));

    vi.doMock(import("@aws-lambda-powertools/parameters/appconfig"), () => ({
      AppConfigProvider: mockAppConfigProvider,
    }));

    vi.doMock(import("../awsClient/appconfigClient/index.js"), () => ({
      getAppConfigClient: mockGetAppConfigClient,
    }));

    const { getAppConfig } = await import("./index.js");
    const result = await getAppConfig();

    expect(mockAppConfigProvider).toHaveBeenCalledWith({
      application: "account-components",
      environment: "dev",
      awsSdkV3Client: {},
    });
    expect(mockGet).toHaveBeenCalledWith("operational", {
      transform: "json",
      maxAge: 300,
    });
    expect(result).toStrictEqual(mockConfig);
  });

  it("passes the correct environment to AppConfigProvider", async () => {
    const mockGet = vi.fn().mockResolvedValue(mockConfig);
    const mockAppConfigProvider = vi.fn().mockImplementation(() => ({
      get: mockGet,
    }));
    const mockGetAppConfigClient = vi.fn().mockReturnValue({
      client: {},
      config: {},
    });

    // @ts-expect-error
    vi.doMock(import("../getEnvironment/index.js"), () => ({
      getEnvironment: vi.fn(() => "production"),
    }));

    vi.doMock(import("@aws-lambda-powertools/parameters/appconfig"), () => ({
      AppConfigProvider: mockAppConfigProvider,
    }));

    vi.doMock(import("../awsClient/appconfigClient/index.js"), () => ({
      getAppConfigClient: mockGetAppConfigClient,
    }));

    const { getAppConfig } = await import("./index.js");
    await getAppConfig();

    expect(mockAppConfigProvider).toHaveBeenCalledWith({
      application: "account-components",
      environment: "production",
      awsSdkV3Client: {},
    });
  });

  it("reuses the provider across calls", async () => {
    const mockGet = vi.fn().mockResolvedValue(mockConfig);
    const mockAppConfigProvider = vi.fn().mockImplementation(() => ({
      get: mockGet,
    }));
    const mockGetAppConfigClient = vi.fn().mockReturnValue({
      client: {},
      config: {},
    });

    // @ts-expect-error
    vi.doMock(import("../getEnvironment/index.js"), () => ({
      getEnvironment: vi.fn(() => "dev"),
    }));

    vi.doMock(import("@aws-lambda-powertools/parameters/appconfig"), () => ({
      AppConfigProvider: mockAppConfigProvider,
    }));

    vi.doMock(import("../awsClient/appconfigClient/index.js"), () => ({
      getAppConfigClient: mockGetAppConfigClient,
    }));

    const { getAppConfig } = await import("./index.js");
    await getAppConfig();
    await getAppConfig();

    expect(mockAppConfigProvider).toHaveBeenCalledTimes(1);
  });
});
