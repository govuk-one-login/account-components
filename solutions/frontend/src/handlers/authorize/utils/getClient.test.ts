import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import type { FastifyReply } from "fastify";
import type { getClient as getClientForType } from "./getClient.js";
import type { ClientEntry } from "../../../../../config/schema/types.js";
import { ErrorResponse } from "./common.js";

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

const createMockReply = () =>
  ({
    redirect: vi.fn(),
  }) as unknown as FastifyReply;

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

    const reply = createMockReply();
    const result = await getClient(
      reply,
      "test-client",
      "https://example.com/callback",
    );

    expect(result).toStrictEqual(mockClient);
  });

  it("returns ErrorResponse when client not found", async () => {
    mockGetClientRegistry.mockResolvedValue([]);

    const reply = createMockReply();
    const result = await getClient(
      reply,
      "unknown-client",
      "https://example.com/callback",
    );

    expect(result).toBeInstanceOf(ErrorResponse);
  });

  it("returns ErrorResponse when redirect_uri not in client redirect_uris", async () => {
    mockGetClientRegistry.mockResolvedValue([mockClient]);

    const reply = createMockReply();
    const result = await getClient(
      reply,
      "test-client",
      "https://malicious.com/callback",
    );

    expect(result).toBeInstanceOf(ErrorResponse);
  });
});
