import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import type { Scope } from "../../../../../commons/utils/authorize/getClaimsSchema.js";
import type { APIGatewayProxyResult } from "aws-lambda";

process.env["REPLAY_ATTACK_TABLE_NAME"] = "test-replay-table";
process.env["API_SESSIONS_TABLE_NAME"] = "test-sessions-table";
process.env["API_SESSION_COOKIE_DOMAIN"] = "example.com";
process.env["FRONTEND_URL"] = "https://frontend.example.com";
process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";

const mockTransactWrite = vi.fn();
const mockGetAppConfig = vi.fn();
const mockLogger = {
  warn: vi.fn(),
};
const mockMetrics = {
  addMetric: vi.fn(),
};
const mockRandomBytes = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: vi.fn(() => ({
      transactWrite: mockTransactWrite,
    })),
  }),
);

vi.mock(import("../../../../../commons/utils/getAppConfig/index.js"), () => ({
  getAppConfig: mockGetAppConfig,
}));

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/logger/index.js"), () => ({
  logger: mockLogger,
}));

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/metrics/index.js"), () => ({
  metrics: mockMetrics,
}));

vi.mock(import("node:crypto"), () => ({
  randomBytes: mockRandomBytes,
}));

const { checkJtiUnusedAndSetUpSession } =
  await import("./checkJtiUnusedAndSetUpSession.js");
const { ErrorResponse } = await import("./common.js");

describe("checkJtiUnusedAndSetUpSession", () => {
  const mockClaims = {
    client_id: "test-client-id",
    iss: "test-client-id",
    aud: "https://example.com/authorize",
    response_type: "code" as const,
    exp: 1234567890,
    iat: 1234567800,
    redirect_uri: "https://example.com/callback",
    scope: "account-delete" as Scope,
    state: "test-state",
    jti: "test-jti-123",
    sub: "test-subject",
    public_sub: "test-public-subject",
    email: "test@example.com",
    govuk_signin_journey_id: "test-journey-id",
  };
  const mockClientId = "test-client-id";
  const mockRedirectUri = "https://example.com/callback";
  const mockState = "test-state";
  const mockAppConfig = {
    jti_nonce_ttl_in_seconds: 300,
    api_session_ttl_in_seconds: 1800,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    vi.spyOn(Date, "now").mockReturnValue(1000000);
    mockRandomBytes.mockReturnValue(
      Buffer.from("abcdef123456789012345678", "hex"), // pragma: allowlist secret
    );
  });

  it("returns redirect response with session cookie when transaction succeeds", async () => {
    mockTransactWrite.mockResolvedValue({});

    const result = await checkJtiUnusedAndSetUpSession(
      mockClaims,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).not.toBeInstanceOf(ErrorResponse);

    const response = result as Exclude<
      typeof result,
      InstanceType<typeof ErrorResponse>
    >;

    expect(response.statusCode).toBe(302);
    expect(response.headers?.["location"]).toBe(
      "https://frontend.example.com/start-session?client_id=test-client-id&redirect_uri=https%3A%2F%2Fexample.com%2Fcallback&state=test-state",
    );
    expect(response.multiValueHeaders?.["Set-Cookie"]).toStrictEqual([
      "apisession=abcdef123456789012345678; Domain=example.com; HttpOnly; SameSite=Strict",
    ]);

    expect(mockTransactWrite).toHaveBeenCalledWith({
      TransactItems: [
        {
          Put: {
            TableName: "test-replay-table",
            Item: {
              nonce: mockClaims.jti,
              expires: 1300,
            },
            ConditionExpression: "attribute_not_exists(nonce)",
          },
        },
        {
          Put: {
            TableName: "test-sessions-table",
            Item: {
              id: "abcdef123456789012345678", // pragma: allowlist secret
              expires: 2800,
              claims: mockClaims,
            },
          },
        },
      ],
    });
  });

  it("returns redirect response when state is not provided", async () => {
    mockTransactWrite.mockResolvedValue({});

    const result = await checkJtiUnusedAndSetUpSession(
      mockClaims,
      mockClientId,
      mockRedirectUri,
    );

    expect(result).not.toBeInstanceOf(ErrorResponse);

    const response = result as Exclude<
      typeof result,
      InstanceType<typeof ErrorResponse>
    >;

    expect(response.statusCode).toBe(302);
    expect(response.headers?.["location"]).toBe(
      "https://frontend.example.com/start-session?client_id=test-client-id&redirect_uri=https%3A%2F%2Fexample.com%2Fcallback",
    );
  });

  it("returns ErrorResponse when JTI already exists", async () => {
    const transactionError = new TransactionCanceledException({
      message: "Transaction cancelled",
      CancellationReasons: [{ Code: "ConditionalCheckFailed" }, {}],
      $metadata: {},
    });
    mockTransactWrite.mockRejectedValue(transactionError);

    const result = await checkJtiUnusedAndSetUpSession(
      mockClaims,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeInstanceOf(ErrorResponse);

    const response = result as Exclude<typeof result, APIGatewayProxyResult>;

    expect(response.errorResponse.statusCode).toBe(302);
    expect(response.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(response.errorResponse.headers?.["location"]).toContain(
      "error_description=E2010",
    );
    expect(response.errorResponse.headers?.["location"]).toContain(
      "state=test-state",
    );
    expect(mockLogger.warn).toHaveBeenCalledWith("JTIAlreadyUsed", {
      client_id: mockClientId,
      jti: mockClaims.jti,
    });
    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "JTIAlreadyUsed",
      MetricUnit.Count,
      1,
    );
  });

  it("returns ErrorResponse when JTI already exists without state", async () => {
    const transactionError = new TransactionCanceledException({
      message: "Transaction cancelled",
      CancellationReasons: [{ Code: "ConditionalCheckFailed" }, {}],
      $metadata: {},
    });
    mockTransactWrite.mockRejectedValue(transactionError);

    const result = await checkJtiUnusedAndSetUpSession(
      mockClaims,
      mockClientId,
      mockRedirectUri,
    );

    expect(result).toBeInstanceOf(ErrorResponse);

    const response = result as Exclude<typeof result, APIGatewayProxyResult>;

    expect(response.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(response.errorResponse.headers?.["location"]).toContain(
      "error_description=E2010",
    );
    expect(response.errorResponse.headers?.["location"]).not.toContain(
      "state=",
    );
  });

  it("returns ErrorResponse for other transaction errors", async () => {
    const transactionError = new TransactionCanceledException({
      message: "Transaction cancelled",
      CancellationReasons: [{ Code: "ValidationException" }],
      $metadata: {},
    });
    mockTransactWrite.mockRejectedValue(transactionError);

    const result = await checkJtiUnusedAndSetUpSession(
      mockClaims,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeInstanceOf(ErrorResponse);

    const response = result as Exclude<typeof result, APIGatewayProxyResult>;

    expect(response.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(response.errorResponse.headers?.["location"]).toContain(
      "error_description=E5001",
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "FailedToCheckJtiUnusedAndSetUpSession",
      {
        client_id: mockClientId,
        jti: mockClaims.jti,
        error: transactionError,
      },
    );
    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "FailedToCheckJtiUnusedAndSetUpSession",
      MetricUnit.Count,
      1,
    );
  });

  it("returns ErrorResponse for non-TransactionCanceledException errors", async () => {
    const genericError = new Error("Database connection failed");
    mockTransactWrite.mockRejectedValue(genericError);

    const result = await checkJtiUnusedAndSetUpSession(
      mockClaims,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeInstanceOf(ErrorResponse);

    const response = result as Exclude<typeof result, APIGatewayProxyResult>;

    expect(response.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(response.errorResponse.headers?.["location"]).toContain(
      "error_description=E5001",
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "FailedToCheckJtiUnusedAndSetUpSession",
      {
        client_id: mockClientId,
        jti: mockClaims.jti,
        error: genericError,
      },
    );
    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "FailedToCheckJtiUnusedAndSetUpSession",
      MetricUnit.Count,
      1,
    );
  });

  it("calculates correct expiry times", async () => {
    const customConfig = {
      jti_nonce_ttl_in_seconds: 600,
      api_session_ttl_in_seconds: 3600,
    };
    mockGetAppConfig.mockResolvedValue(customConfig);
    mockTransactWrite.mockResolvedValue({});

    await checkJtiUnusedAndSetUpSession(
      mockClaims,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(mockTransactWrite).toHaveBeenCalledWith({
      TransactItems: [
        {
          Put: {
            TableName: "test-replay-table",
            Item: {
              nonce: mockClaims.jti,
              expires: 1600,
            },
            ConditionExpression: "attribute_not_exists(nonce)",
          },
        },
        {
          Put: {
            TableName: "test-sessions-table",
            Item: {
              id: "abcdef123456789012345678", // pragma: allowlist secret
              expires: 4600,
              claims: mockClaims,
            },
          },
        },
      ],
    });
  });

  it("handles TransactionCanceledException without CancellationReasons", async () => {
    const transactionError = new TransactionCanceledException({
      message: "Transaction cancelled",
      $metadata: {},
    });
    mockTransactWrite.mockRejectedValue(transactionError);

    const result = await checkJtiUnusedAndSetUpSession(
      mockClaims,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeInstanceOf(ErrorResponse);

    const response = result as Exclude<typeof result, APIGatewayProxyResult>;

    expect(response.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(response.errorResponse.headers?.["location"]).toContain(
      "error_description=E5001",
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "FailedToCheckJtiUnusedAndSetUpSession",
      {
        client_id: mockClientId,
        jti: mockClaims.jti,
        error: transactionError,
      },
    );
  });

  it("handles TransactionCanceledException with empty CancellationReasons", async () => {
    const transactionError = new TransactionCanceledException({
      message: "Transaction cancelled",
      CancellationReasons: [],
      $metadata: {},
    });
    mockTransactWrite.mockRejectedValue(transactionError);

    const result = await checkJtiUnusedAndSetUpSession(
      mockClaims,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeInstanceOf(ErrorResponse);

    const response = result as Exclude<typeof result, APIGatewayProxyResult>;

    expect(response.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(response.errorResponse.headers?.["location"]).toContain(
      "error_description=E5001",
    );
  });

  it("returns ErrorResponse when API_SESSION_COOKIE_DOMAIN is missing", async () => {
    const originalDomain = process.env["API_SESSION_COOKIE_DOMAIN"];
    delete process.env["API_SESSION_COOKIE_DOMAIN"];

    const result = await checkJtiUnusedAndSetUpSession(
      mockClaims,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeInstanceOf(ErrorResponse);

    const response = result as Exclude<typeof result, APIGatewayProxyResult>;

    expect(response.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(response.errorResponse.headers?.["location"]).toContain(
      "error_description=E5001",
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "FailedToCheckJtiUnusedAndSetUpSession",
      expect.objectContaining({
        client_id: mockClientId,
        jti: mockClaims.jti,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error: expect.any(Error),
      }),
    );

    process.env["API_SESSION_COOKIE_DOMAIN"] = originalDomain;
  });

  it("returns ErrorResponse when FRONTEND_URL is missing", async () => {
    const originalUrl = process.env["FRONTEND_URL"];
    delete process.env["FRONTEND_URL"];

    const result = await checkJtiUnusedAndSetUpSession(
      mockClaims,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeInstanceOf(ErrorResponse);

    const response = result as Exclude<typeof result, APIGatewayProxyResult>;

    expect(response.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(response.errorResponse.headers?.["location"]).toContain(
      "error_description=E5001",
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "FailedToCheckJtiUnusedAndSetUpSession",
      expect.objectContaining({
        client_id: mockClientId,
        jti: mockClaims.jti,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error: expect.any(Error),
      }),
    );

    process.env["FRONTEND_URL"] = originalUrl;
  });

  it("handles getAppConfig failure", async () => {
    const configError = new Error("Failed to get app config");
    mockGetAppConfig.mockRejectedValue(configError);

    const result = await checkJtiUnusedAndSetUpSession(
      mockClaims,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeInstanceOf(ErrorResponse);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "FailedToCheckJtiUnusedAndSetUpSession",
      {
        client_id: mockClientId,
        jti: mockClaims.jti,
        error: configError,
      },
    );
    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "FailedToCheckJtiUnusedAndSetUpSession",
      MetricUnit.Count,
      1,
    );
  });
});
