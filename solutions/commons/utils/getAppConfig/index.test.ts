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

  it("returns local config when environment is local", async () => {
    // @ts-expect-error
    vi.doMock(import("../getEnvironment/index.js"), () => ({
      getEnvironment: vi.fn(() => "local"),
    }));

    // @ts-expect-error
    vi.doMock(import("../../../config/local-config.json"), () => mockConfig);

    const { getAppConfig } = await import("./index.js");
    const result = await getAppConfig();

    expect(result).toStrictEqual(mockConfig);
  });

  it("returns appconfig data when environment is not local", async () => {
    const mockRetrieveAppConfig = vi.fn().mockResolvedValue(mockConfig);
    const mockGetAppConfigClient = vi.fn().mockReturnValue({
      client: {},
      config: {},
    });

    // @ts-expect-error
    vi.doMock(import("../getEnvironment/index.js"), () => ({
      getEnvironment: vi.fn(() => "dev"),
    }));

    vi.doMock(import("@aws-lambda-powertools/parameters/appconfig"), () => ({
      getAppConfig: mockRetrieveAppConfig,
    }));

    vi.doMock(import("../awsClient/appconfigClient/index.js"), () => ({
      getAppConfigClient: mockGetAppConfigClient,
    }));

    const { getAppConfig } = await import("./index.js");
    const result = await getAppConfig();

    expect(mockRetrieveAppConfig).toHaveBeenCalledWith("operational", {
      application: "account-components",
      environment: "dev",
      transform: "json",
      awsSdkV3Client: {},
    });
    expect(result).toStrictEqual(mockConfig);
  });

  it("calls getAppConfig with correct parameters for production environment", async () => {
    const mockRetrieveAppConfig = vi.fn().mockResolvedValue(mockConfig);
    const mockGetAppConfigClient = vi.fn().mockReturnValue({
      client: {},
      config: {},
    });

    // @ts-expect-error
    vi.doMock(import("../getEnvironment/index.js"), () => ({
      getEnvironment: vi.fn(() => "production"),
    }));

    vi.doMock(import("@aws-lambda-powertools/parameters/appconfig"), () => ({
      getAppConfig: mockRetrieveAppConfig,
    }));

    vi.doMock(import("../awsClient/appconfigClient/index.js"), () => ({
      getAppConfigClient: mockGetAppConfigClient,
    }));

    const { getAppConfig } = await import("./index.js");
    await getAppConfig();

    expect(mockRetrieveAppConfig).toHaveBeenCalledWith("operational", {
      application: "account-components",
      environment: "production",
      transform: "json",
      awsSdkV3Client: {},
    });
  });
});
