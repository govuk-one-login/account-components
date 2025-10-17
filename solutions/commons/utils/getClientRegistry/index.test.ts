import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { getClientRegistry } from "./index.js";

vi.mock("@aws-lambda-powertools/parameters/appconfig", () => ({
  getAppConfig: vi.fn()
}));
vi.mock("../getEnvironment/index.js", () => ({
  getEnvironment: vi.fn()
}));
vi.mock("../awsClient/index.js", () => ({
  getAppConfigClient: vi.fn()
}));
vi.mock("../../../config/local-config.json", () => ({
  default: {
    client_registry: [
      {
        client_id: "ABCDEF12345678901234567890123456",
        scope: "am-account-delete",
        redirect_uris: ["https://signin.build.account.gov.uk/acm-callback"],
        client_name: "Auth",
        jwks_uri: "https://signin.build.account.gov.uk/.well-known/jwks.json"
      },
      {
        client_id: "23456789012345678901234567890123",
        scope: "am-account-delete",
        redirect_uris: ["https://home.build.account.gov.uk/acm-callback"],
        client_name: "Home",
        jwks_uri: "https://home.build.account.gov.uk/.well-known/jwks.json"
      }
    ]
  }
}));

const mockGetAppConfig = vi.fn();
const mockGetEnvironment = vi.fn();
const mockGetAppConfigClient = vi.fn();

vi.mocked(
  await import("@aws-lambda-powertools/parameters/appconfig"),
).getAppConfig = mockGetAppConfig;
// @ts-expect-error
vi.mocked(await import("../getEnvironment/index.js")).getEnvironment =
  mockGetEnvironment;
vi.mocked(await import("../awsClient/index.js")).getAppConfigClient =
  mockGetAppConfigClient;

describe("getClientRegistry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("local environment", () => {
    beforeEach(() => {
      mockGetEnvironment.mockReturnValue("local");
    });

    it("returns client registry from local config", async () => {
      const result = await getClientRegistry();

      expect(result).toEqual([
        {
          client_id: "ABCDEF12345678901234567890123456",
          scope: "am-account-delete",
          redirect_uris: ["https://signin.build.account.gov.uk/acm-callback"],
          client_name: "Auth",
          jwks_uri: "https://signin.build.account.gov.uk/.well-known/jwks.json",
        },
        {
          client_id: "23456789012345678901234567890123",
          scope: "am-account-delete",
          redirect_uris: ["https://home.build.account.gov.uk/acm-callback"],
          client_name: "Home",
          jwks_uri: "https://home.build.account.gov.uk/.well-known/jwks.json",
        },
      ]);
      expect(mockGetAppConfig).not.toHaveBeenCalled();
    });
  });

  describe("non-local environment", () => {
    beforeEach(() => {
      mockGetEnvironment.mockReturnValue("dev");
      mockGetAppConfigClient.mockReturnValue({});
    });

    it("returns client registry from AppConfig", async () => {
      const mockConfig = {
        client_registry: [
          {
            client_id: "test-client-id",
            scope: "test-scope",
            redirect_uris: ["https://test.example.com/callback"],
            client_name: "Test Client",
            jwks_uri: "https://test.example.com/.well-known/jwks.json",
          },
        ],
      };
      mockGetAppConfig.mockResolvedValue(mockConfig);

      const result = await getClientRegistry();

      expect(result).toEqual(mockConfig.client_registry);
      expect(mockGetAppConfig).toHaveBeenCalledWith("operational", {
        application: "account-components",
        environment: "dev",
        transform: "json",
        awsSdkV3Client: {},
      });
    });

    it("returns empty array when config is null", async () => {
      mockGetAppConfig.mockResolvedValue(null);

      const result = await getClientRegistry();

      expect(result).toEqual([]);
    });

    it("returns empty array when config has no client_registry", async () => {
      mockGetAppConfig.mockResolvedValue({ other_field: "value" });

      const result = await getClientRegistry();

      expect(result).toEqual([]);
    });

    it("returns empty array when config is not an object", async () => {
      mockGetAppConfig.mockResolvedValue("invalid config");

      const result = await getClientRegistry();

      expect(result).toEqual([]);
    });
  });
});
