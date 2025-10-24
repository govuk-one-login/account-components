import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";
import type {
  handler as handlerForType,
  checkRequest as checkRequestForType,
} from "./authorize.js";

// @ts-expect-error
vi.mock(import("../../../commons/utils/logger/index.js"), () => ({
  logger: { warn: vi.fn() },
}));

// @ts-expect-error
vi.mock(import("../../../commons/utils/metrics/index.js"), () => ({
  metrics: { addMetric: vi.fn() },
}));

process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";

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

let handler: typeof handlerForType;
let checkRequest: typeof checkRequestForType;

describe("authorize", () => {
  beforeAll(async () => {
    const authorizeModule = await import("./authorize.js");
    handler = authorizeModule.handler;
    checkRequest = authorizeModule.checkRequest;
  });

  describe("checkRequest", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns undefined for valid request", () => {
      const event = createMockEvent();
      const result = checkRequest(event);

      expect(result).toBeUndefined();
    });

    it("returns error for missing request parameter", () => {
      const event = createMockEvent({
        queryStringParameters: {
          response_type: "code",
          scope: "test-scope",
          client_id: "test-client",
          redirect_uri: "https://example.com/callback",
        },
      });
      const result = checkRequest(event);

      expect(result).toEqual({
        statusCode: 302,
        headers: { location: "https://example.com/error" },
        body: "",
      });
    });

    it("returns error for invalid response_type", () => {
      const event = createMockEvent({
        queryStringParameters: {
          request: "test-request",
          response_type: "token",
          scope: "test-scope",
          client_id: "test-client",
          redirect_uri: "https://example.com/callback",
        },
      });
      const result = checkRequest(event);

      expect(result).toEqual({
        statusCode: 302,
        headers: { location: "https://example.com/error" },
        body: "",
      });
    });

    it("returns error for invalid redirect_uri", () => {
      const event = createMockEvent({
        queryStringParameters: {
          request: "test-request",
          response_type: "code",
          scope: "test-scope",
          client_id: "test-client",
          redirect_uri: "invalid-url",
        },
      });
      const result = checkRequest(event);

      expect(result).toEqual({
        statusCode: 302,
        headers: { location: "https://example.com/error" },
        body: "",
      });
    });

    it("returns error for null queryStringParameters", () => {
      const event = createMockEvent({ queryStringParameters: null });
      const result = checkRequest(event);

      expect(result).toEqual({
        statusCode: 302,
        headers: { location: "https://example.com/error" },
        body: "",
      });
    });
  });

  describe("authorize handler", () => {
    it("returns 200 status with authorized message for valid request", async () => {
      const event = createMockEvent();
      const result = await handler(event);

      expect(result).toStrictEqual({
        statusCode: 200,
        body: JSON.stringify({ message: "Authorized" }),
      });
    });

    it("returns error response for invalid request", async () => {
      const event = createMockEvent({ queryStringParameters: {} });
      const result = await handler(event);

      expect(result).toStrictEqual({
        statusCode: 302,
        headers: { location: "https://example.com/error" },
        body: "",
      });
    });
  });
});
