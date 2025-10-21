import { describe, expect, it, vi } from "vitest";
import type { Client } from "../../../../../commons/utils/getClientRegistry/index.js";
import { getClientRegistryWithInvalidClient } from "./index.js";

vi.mock(
  import("../../../../../commons/utils/getClientRegistry/index.js"),
  () => ({
    getClientRegistry: vi.fn(),
  }),
);

describe("getClientRegistryWithInvalidClient", () => {
  const mockClient: Client = {
    client_id: "valid_client_id",
    scope: "valid-scope",
    redirect_uris: ["https://valid.com"],
    client_name: "Valid Client",
    jwks_uri: "https://valid.com/.well-known/jwks.json",
  };

  const invalidClient: Client = {
    client_id: "A1B2C3D4E5F6G7H8A1B2C3D4E5F6G7H8",
    scope: "am-account-delete",
    redirect_uris: ["https://nowhere"],
    client_name: "Invalid",
    jwks_uri: "https://nowhere/.well-known/jwks.json",
  };

  it("adds invalid client to existing registry", async () => {
    const { getClientRegistry } = await import(
      "../../../../../commons/utils/getClientRegistry/index.js"
    );
    vi.mocked(getClientRegistry).mockResolvedValue([mockClient]);

    const result = await getClientRegistryWithInvalidClient();

    expect(result).toEqual([mockClient, invalidClient]);
  });
});
