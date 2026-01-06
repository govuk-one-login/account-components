import { expect, it, describe, vi } from "vitest";
import { getClientRegistry } from "./index.js";
import type {
  AppConfigSchema,
  ClientEntry,
} from "../../../config/schema/types.js";

vi.mock(import("../getAppConfig/index.js"), () => ({
  getAppConfig: vi.fn(),
}));

describe("getClientRegistry", () => {
  it("returns client_registry from app config", async () => {
    const mockClientRegistry = [
      {
        client_id: "test-client",
        scope: "openid profile",
        redirect_uris: ["https://example.com/callback"],
        client_name: "Test Client",
        jwks_uri: "https://example.com/.well-known/jwks.json",
      },
    ];

    const mockAppConfig: AppConfigSchema = {
      client_registry: mockClientRegistry as [ClientEntry, ...ClientEntry[]],
      jti_nonce_ttl_in_seconds: 300,
      api_session_ttl_in_seconds: 300,
      auth_code_ttl: 300,
      jwks_cache_max_age: 1000,
      jwks_http_timeout: 1000,
    };

    const { getAppConfig } = await import("../getAppConfig/index.js");
    vi.mocked(getAppConfig).mockResolvedValue(mockAppConfig);

    const result = await getClientRegistry();

    expect(result).toBe(mockClientRegistry);
    expect(getAppConfig).toHaveBeenCalledTimes(1);
  });
});
