import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import type { getClient as getClientForType } from "./getClient.js";
import type { ClientEntry } from "../../../../../config/schema/types.js";

const ORIGINAL_ENV = { ...process.env };

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/logger/index.js"), () => ({
  logger: { warn: vi.fn() },
}));

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/metrics/index.js"), () => ({
  metrics: { addMetric: vi.fn() },
}));

const mockGetClientRegistry = vi.fn().mockResolvedValue([]);
vi.mock(
  import("../../../../../commons/utils/getClientRegistry/index.js"),
  () => ({
    getClientRegistry: mockGetClientRegistry,
  }),
);

let getClient: typeof getClientForType;

describe("getClient", () => {
  const mockClient: ClientEntry = {
    client_id: "test-client",
    scope: "test-scope",
    redirect_uris: ["https://example.com/callback"],
    client_name: "Test Client",
    jwks_uri: "https://example.com/jwks",
    consider_user_logged_in: false,
  };

  beforeAll(async () => {
    process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";

    const getClientModule = await import("./getClient.js");
    getClient = getClientModule.getClient;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns client for valid client_id and redirect_uri", async () => {
    mockGetClientRegistry.mockResolvedValue([mockClient]);

    const result = await getClient(
      "test-client",
      "https://example.com/callback",
    );

    expect(result).toStrictEqual(mockClient);
  });

  it("returns ErrorResponse when client not found", async () => {
    mockGetClientRegistry.mockResolvedValue([]);

    const result = await getClient(
      "unknown-client",
      "https://example.com/callback",
    );

    // eslint-disable-next-line vitest/prefer-strict-equal
    expect(result).toEqual({
      errorResponse: {
        statusCode: 302,
        headers: { location: "https://example.com/error" },
        body: "",
      },
    });
  });

  it("returns ErrorResponse when redirect_uri not in client redirect_uris", async () => {
    mockGetClientRegistry.mockResolvedValue([mockClient]);

    const result = await getClient(
      "test-client",
      "https://malicious.com/callback",
    );

    // eslint-disable-next-line vitest/prefer-strict-equal
    expect(result).toEqual({
      errorResponse: {
        statusCode: 302,
        headers: { location: "https://example.com/error" },
        body: "",
      },
    });
  });
});
