import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "./index.js";
import type { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy.js";
import type { Context } from "aws-lambda";
import { errorManager } from "./utils/errors.js";
import * as querystring from "node:querystring";

const mockContext = {} as unknown as Context;

vi.mock(import("./utils/verifyClientAssertion.js"));
const mockVerifyClientAssertion = vi.mocked(
  await import("./utils/verifyClientAssertion.js"),
).verifyClientAssertion;

vi.mock(import("./utils/verifyJti.js"));
const mockHasJtiBeenUsed = vi.mocked(
  await import("./utils/verifyJti.js"),
).verifyJti;

vi.mock(import("./utils/getAuthRequest.js"));
const mockGetAuthRequest = vi.mocked(
  await import("./utils/getAuthRequest.js"),
).getAuthRequest;

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: { addMetric: vi.fn() },
  metricsAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/logger/index.js"), () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/awsClient/tracer.js"), () => ({
  tracer: { captureLambdaHandler: (fn) => fn },
}));

vi.mock(import("./utils/createAccessToken.js"));
const mockCreateAccessToken = vi.mocked(
  await import("./utils/createAccessToken.js"),
).createAccessToken;

describe("token handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 status with hello world body", async () => {
    mockVerifyClientAssertion.mockResolvedValue({
      jti: "jti",
      redirect_uri: "https://example.com/callback",
    } as any as Awaited<ReturnType<typeof mockVerifyClientAssertion>>);
    mockGetAuthRequest.mockResolvedValue({
      redirect_uri: "https://example.com/callback",
    } as any as Awaited<ReturnType<typeof mockGetAuthRequest>>);
    mockHasJtiBeenUsed.mockResolvedValue();
    mockCreateAccessToken.mockResolvedValue("mock-access-token");

    const result = await handler(
      {
        body: querystring.stringify({
          grant_type: "authorization_code",
          code: "some_code",
          redirect_uri: "https://example.com/callback",
          client_assertion_type:
            "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          client_assertion: "some_client_assertion",
        }),
      } as APIGatewayProxyEvent,
      mockContext,
    );

    const parsedBody = JSON.parse(result.body) as unknown as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    expect({ ...result, body: parsedBody }).toStrictEqual({
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        access_token: "mock-access-token",
        token_type: "Bearer",
        expires_in: 3600,
      },
    });
  });

  it("returns 400 status if the client assertion verification fails", async () => {
    mockVerifyClientAssertion.mockImplementation(() => {
      errorManager.throwError("invalidClientAssertion", "error");
      // line below would never be reached, it's to satisfy TS that a value is returned
      return {} as any as ReturnType<typeof mockVerifyClientAssertion>;
    });
    const result = await handler(
      {
        body: querystring.stringify({
          grant_type: "authorization_code",
          code: "some_code",
          redirect_uri: "https://example.com/callback",
          client_assertion_type:
            "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          client_assertion: "some_client_assertion",
        }),
      } as APIGatewayProxyEvent,
      mockContext,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4002",
      }),
    });
  });

  it("returns 400 status with invalid_request error for invalid request", async () => {
    const result = await handler(
      {
        body: querystring.stringify({
          grant_type: "invalid_grant",
          code: "",
          redirect_uri: "",
          client_assertion_type: "invalid_type",
          client_assertion: "",
        }),
      } as APIGatewayProxyEvent,
      mockContext,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4001",
      }),
    });
  });

  it("returns an error when jti has been used before", async () => {
    mockHasJtiBeenUsed.mockImplementationOnce(async () => {
      errorManager.throwError("invalidRequest", "jti found: some_jti");
    });

    const result = await handler(
      {
        body: querystring.stringify({
          grant_type: "authorization_code",
          code: "some_code",
          redirect_uri: "https://example.com/callback",
          client_assertion_type:
            "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          client_assertion: "some_client_assertion",
        }),
      } as APIGatewayProxyEvent,
      mockContext,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4002",
      }),
    });
  });
});
