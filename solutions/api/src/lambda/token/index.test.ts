import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "./index.js";
import type { APIGatewayProxyResult } from "aws-lambda";
import type { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy.js";
import type { Context } from "aws-lambda";
import * as querystring from "node:querystring";

const mockContext = {} as unknown as Context;

vi.mock(import("./utils/verifyClientAssertion.js"));
const mockVerifyClientAssertion = vi.mocked(
  await import("./utils/verifyClientAssertion.js"),
).verifyClientAssertion;

vi.mock(import("./utils/verifyJti.js"));
const mockVerifyJti = vi.mocked(await import("./utils/verifyJti.js")).verifyJti;

vi.mock(import("./utils/getAuthRequest.js"));
const mockGetAuthRequest = vi.mocked(
  await import("./utils/getAuthRequest.js"),
).getAuthRequest;

vi.mock(import("../../utils/common.js"));
const mockGetApiBaseUrlWithStage = vi.mocked(
  await import("../../utils/common.js"),
).getApiBaseUrlWithStage;

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

vi.mock(
  import("../../../../commons/utils/normalizeAPIGatewayProxyEventHandlerWrapper/index.js"),
  () => ({
    normalizeAPIGatewayProxyEventHandlerWrapper: (fn) => fn,
  }),
);

vi.mock(import("./utils/createAccessToken.js"));
const mockCreateAccessToken = vi.mocked(
  await import("./utils/createAccessToken.js"),
).createAccessToken;

vi.mock(import("./utils/assertTokenRequest.js"));
const mockAssertTokenRequest = vi.mocked(
  await import("./utils/assertTokenRequest.js"),
).assertTokenRequest;

vi.mock(import("./utils/errors.js"));
const mockErrorManager = vi.mocked(await import("./utils/errors.js"))
  .errorManager as unknown as {
  handleError: ReturnType<typeof vi.fn>;
};

describe("token handler", () => {
  const mockApiBaseUrl = "https://api.example.com/v1";

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the getApiBaseUrlWithStage function
    mockGetApiBaseUrlWithStage.mockReturnValue(mockApiBaseUrl);

    // Mock assertTokenRequest to do nothing by default (successful validation)
    mockAssertTokenRequest.mockImplementation(() => {
      // Empty implementation for successful validation
    });

    // Mock error manager to return proper error responses
    mockErrorManager.handleError.mockReturnValue({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4002",
      }),
    });
  });

  const createMockEvent = (body: string): APIGatewayProxyEvent =>
    ({
      body,
      headers: {
        Host: "api.example.com",
      },
      requestContext: {
        stage: "v1",
        domainName: "api.example.com",
      },
    }) as unknown as APIGatewayProxyEvent;

  it("returns 200 status with hello world body", async () => {
    mockVerifyClientAssertion.mockResolvedValue({
      jti: "jti",
      iss: "test-client-id",
      redirect_uri: "https://example.com/callback",
    } as any as Awaited<ReturnType<typeof mockVerifyClientAssertion>>);
    mockGetAuthRequest.mockResolvedValue({
      redirect_uri: "https://example.com/callback",
    } as any as Awaited<ReturnType<typeof mockGetAuthRequest>>);
    mockVerifyJti.mockResolvedValue();
    mockCreateAccessToken.mockResolvedValue("mock-access-token");

    const mockEvent = createMockEvent(
      querystring.stringify({
        grant_type: "authorization_code",
        code: "some_code",
        redirect_uri: "https://example.com/callback",
        client_assertion_type:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: "some_client_assertion",
      }),
    );

    const result: APIGatewayProxyResult = await handler(mockEvent, mockContext);

    // Ensure result is properly typed for expect calls
    expect(mockGetApiBaseUrlWithStage).toHaveBeenCalledWith(mockEvent);
    expect(mockVerifyClientAssertion).toHaveBeenCalledWith(
      "some_client_assertion",
      mockApiBaseUrl,
    );
    expect(mockCreateAccessToken).toHaveBeenCalledWith(
      { redirect_uri: "https://example.com/callback" },
      mockApiBaseUrl,
    );

    const parsedBody = JSON.parse(result.body) as {
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
        expires_in: 300,
      },
    });
  });

  it("returns 400 status if the client assertion verification fails", async () => {
    mockVerifyClientAssertion.mockImplementation(() => {
      throw new Error("Client assertion verification failed");
    });

    const mockEvent = createMockEvent(
      querystring.stringify({
        grant_type: "authorization_code",
        code: "some_code",
        redirect_uri: "https://example.com/callback",
        client_assertion_type:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: "some_client_assertion",
      }),
    );

    const result: APIGatewayProxyResult = await handler(mockEvent, mockContext);

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4002",
      }),
    });
  });

  it("returns 400 status with invalid_request error for invalid request", async () => {
    mockAssertTokenRequest.mockImplementation(() => {
      throw new Error("Invalid request");
    });

    // Override the error manager for this specific test to return E4001
    mockErrorManager.handleError.mockReturnValueOnce({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4001",
      }),
    });

    const mockEvent = createMockEvent(
      querystring.stringify({
        grant_type: "invalid_grant",
        code: "",
        redirect_uri: "",
        client_assertion_type: "invalid_type",
        client_assertion: "",
      }),
    );

    const result: APIGatewayProxyResult = await handler(mockEvent, mockContext);

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4001",
      }),
    });
  });

  it("returns an error when jti has been used before", async () => {
    mockVerifyClientAssertion.mockResolvedValue({
      jti: "some_jti",
      iss: "test-client-id",
    } as any as Awaited<ReturnType<typeof mockVerifyClientAssertion>>);

    mockGetAuthRequest.mockResolvedValue({
      redirect_uri: "https://example.com/callback",
    } as any as Awaited<ReturnType<typeof mockGetAuthRequest>>);

    mockVerifyJti.mockImplementation(async () => {
      throw new Error("JTI has been used before");
    });

    const mockEvent = createMockEvent(
      querystring.stringify({
        grant_type: "authorization_code",
        code: "some_code",
        redirect_uri: "https://example.com/callback",
        client_assertion_type:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: "some_client_assertion",
      }),
    );

    const result: APIGatewayProxyResult = await handler(mockEvent, mockContext);

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4002",
      }),
    });
  });
});
