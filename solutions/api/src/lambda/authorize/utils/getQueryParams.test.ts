import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterAll,
} from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";
import type { getQueryParams as getQueryParamsForType } from "./getQueryParams.js";

const ORIGINAL_ENV = { ...process.env };

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/observability/index.js"), () => ({
  metrics: { addMetric: vi.fn() },
  logger: { warn: vi.fn() },
}));

const createMockEvent = (
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent =>
  ({
    queryStringParameters: {
      request: "test-request",
      response_type: "code",
      scope: "test-scope",
      client_id: "test-client",
      redirect_uri: "https://example.com/callback",
    },
    ...overrides,
  }) as APIGatewayProxyEvent;

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
    const event = createMockEvent();
    const result = getQueryParams(event);

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
    const event = createMockEvent({
      queryStringParameters: {
        request: "test-request",
        response_type: "code",
        scope: "test-scope",
        client_id: "test-client",
        redirect_uri: "https://example.com/callback",
        state: "test-state",
      },
    });
    const result = getQueryParams(event);

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
    const event = createMockEvent({
      queryStringParameters: {
        response_type: "code",
        scope: "test-scope",
        client_id: "test-client",
        redirect_uri: "https://example.com/callback",
      },
    });
    const result = getQueryParams(event);

    // eslint-disable-next-line vitest/prefer-strict-equal
    expect(result).toEqual({
      errorResponse: {
        statusCode: 302,
        headers: { location: "https://example.com/error" },
        body: "",
      },
    });
  });

  it("returns ErrorResponse for invalid response_type", () => {
    const event = createMockEvent({
      queryStringParameters: {
        request: "test-request",
        response_type: "token",
        scope: "test-scope",
        client_id: "test-client",
        redirect_uri: "https://example.com/callback",
      },
    });
    const result = getQueryParams(event);

    // eslint-disable-next-line vitest/prefer-strict-equal
    expect(result).toEqual({
      errorResponse: {
        statusCode: 302,
        headers: { location: "https://example.com/error" },
        body: "",
      },
    });
  });

  it("returns ErrorResponse for invalid redirect_uri", () => {
    const event = createMockEvent({
      queryStringParameters: {
        request: "test-request",
        response_type: "code",
        scope: "test-scope",
        client_id: "test-client",
        redirect_uri: "invalid-url",
      },
    });
    const result = getQueryParams(event);

    // eslint-disable-next-line vitest/prefer-strict-equal
    expect(result).toEqual({
      errorResponse: {
        statusCode: 302,
        headers: { location: "https://example.com/error" },
        body: "",
      },
    });
  });

  it("returns ErrorResponse for null queryStringParameters", () => {
    const event = createMockEvent({ queryStringParameters: null });
    const result = getQueryParams(event);

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
