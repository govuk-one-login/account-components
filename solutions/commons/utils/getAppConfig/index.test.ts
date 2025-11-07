import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@aws-lambda-powertools/parameters/appconfig"));
vi.mock(import("../getEnvironment/index.js"));
vi.mock(import("../awsClient/appconfigClient/index.js"));

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
  pre_session_ttl_in_seconds: 300,
};

describe("getAppConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns local config when environment is local", async () => {
    vi.doMock("../getEnvironment/index.js", () => ({
      getEnvironment: vi.fn(() => "local"),
    }));

    vi.doMock("../../../config/local-config.json", () => mockConfig);

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

    vi.doMock("../getEnvironment/index.js", () => ({
      getEnvironment: vi.fn(() => "dev"),
    }));

    vi.doMock("@aws-lambda-powertools/parameters/appconfig", () => ({
      getAppConfig: mockRetrieveAppConfig,
    }));

    vi.doMock("../awsClient/appconfigClient/index.js", () => ({
      getAppConfigClient: mockGetAppConfigClient,
    }));

    const { getAppConfig } = await import("./index.js");
    const result = await getAppConfig();

    expect(mockRetrieveAppConfig).toHaveBeenCalledWith("operational", {
      application: "account-components",
      environment: "dev",
      transform: "json",
      awsSdkV3Client: { client: {}, config: {} },
    });
    expect(result).toStrictEqual(mockConfig);
  });

  it("calls getAppConfig with correct parameters for production environment", async () => {
    const mockRetrieveAppConfig = vi.fn().mockResolvedValue(mockConfig);
    const mockGetAppConfigClient = vi.fn().mockReturnValue({
      client: {},
      config: {},
    });

    vi.doMock("../getEnvironment/index.js", () => ({
      getEnvironment: vi.fn(() => "production"),
    }));

    vi.doMock("@aws-lambda-powertools/parameters/appconfig", () => ({
      getAppConfig: mockRetrieveAppConfig,
    }));

    vi.doMock("../awsClient/appconfigClient/index.js", () => ({
      getAppConfigClient: mockGetAppConfigClient,
    }));

    const { getAppConfig } = await import("./index.js");
    await getAppConfig();

    expect(mockRetrieveAppConfig).toHaveBeenCalledWith("operational", {
      application: "account-components",
      environment: "production",
      transform: "json",
      awsSdkV3Client: { client: {}, config: {} },
    });
  });
});
