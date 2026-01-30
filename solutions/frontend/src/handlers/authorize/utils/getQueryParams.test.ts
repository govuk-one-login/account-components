import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterAll,
} from "vitest";
import type { FastifyReply } from "fastify";
import type { getQueryParams as getQueryParamsForType } from "./getQueryParams.js";
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

const createMockReply = () =>
  ({
    redirect: vi.fn(),
  }) as unknown as FastifyReply;

const createMockQuery = (overrides: Record<string, unknown> = {}) => ({
  request: "test-request",
  response_type: "code",
  scope: "test-scope",
  client_id: "test-client",
  redirect_uri: "https://example.com/callback",
  ...overrides,
});

let getQueryParams: typeof getQueryParamsForType;

describe("getQueryParams", () => {
  beforeAll(async () => {
    process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";

    const getQueryParamsModule = await import("./getQueryParams.js");
    getQueryParams = getQueryParamsModule.getQueryParams;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns parsed query params for valid request", () => {
    const reply = createMockReply();
    const query = createMockQuery();
    const result = getQueryParams(reply, query);

    // eslint-disable-next-line vitest/prefer-strict-equal
    expect(result).toEqual({
      request: "test-request",
      response_type: "code",
      scope: "test-scope",
      client_id: "test-client",
      redirect_uri: "https://example.com/callback",
    });
  });

  it("returns parsed query params with optional state parameter", () => {
    const reply = createMockReply();
    const query = createMockQuery({ state: "test-state" });
    const result = getQueryParams(reply, query);

    expect(result).toStrictEqual({
      request: "test-request",
      response_type: "code",
      scope: "test-scope",
      client_id: "test-client",
      redirect_uri: "https://example.com/callback",
      state: "test-state",
    });
  });

  it("returns ErrorResponse for missing request parameter", () => {
    const reply = createMockReply();
    const query = createMockQuery({ request: undefined });
    const result = getQueryParams(reply, query);

    expect(result).toBeInstanceOf(ErrorResponse);
  });

  it("returns ErrorResponse for invalid response_type", () => {
    const reply = createMockReply();
    const query = createMockQuery({ response_type: "token" });
    const result = getQueryParams(reply, query);

    expect(result).toBeInstanceOf(ErrorResponse);
  });

  it("returns ErrorResponse for invalid redirect_uri", () => {
    const reply = createMockReply();
    const query = createMockQuery({ redirect_uri: "invalid-url" });
    const result = getQueryParams(reply, query);

    expect(result).toBeInstanceOf(ErrorResponse);
  });

  it("returns ErrorResponse for null query", () => {
    const reply = createMockReply();
    const result = getQueryParams(reply, null);

    expect(result).toBeInstanceOf(ErrorResponse);
  });
});
