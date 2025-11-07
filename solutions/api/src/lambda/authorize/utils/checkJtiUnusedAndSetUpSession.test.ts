import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

process.env["REPLAY_ATTACK_TABLE_NAME"] = "test-replay-table";
process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";

const mockTransactWrite = vi.fn();
const mockGetAppConfig = vi.fn();
const mockLogger = {
  warn: vi.fn(),
};
const mockMetrics = {
  addMetric: vi.fn(),
};

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

const { checkJtiUnusedAndSetUpSession } = await import(
  "./checkJtiUnusedAndSetUpSession.js"
);
const { ErrorResponse } = await import("./common.js");

describe("checkJtiUnusedAndSetUpSession", () => {
  const mockJti = "test-jti-123";
  const mockClientId = "test-client-id";
  const mockRedirectUri = "https://example.com/callback";
  const mockState = "test-state";
  const mockAppConfig = { jti_nonce_ttl_in_seconds: 300 };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    vi.spyOn(Date, "now").mockReturnValue(1000000);
  });

  it("returns undefined when transaction succeeds", async () => {
    mockTransactWrite.mockResolvedValue({});

    const result = await checkJtiUnusedAndSetUpSession(
      mockJti,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeUndefined();
    expect(mockTransactWrite).toHaveBeenCalledWith({
      TransactItems: [
        {
          Put: {
            TableName: "test-replay-table",
            Item: {
              nonce: mockJti,
              expires: 1300,
            },
            ConditionExpression: "attribute_not_exists(nonce)",
          },
        },
      ],
    });
  });

  it("returns undefined when state is not provided", async () => {
    mockTransactWrite.mockResolvedValue({});

    const result = await checkJtiUnusedAndSetUpSession(
      mockJti,
      mockClientId,
      mockRedirectUri,
    );

    expect(result).toBeUndefined();
  });

  it("returns ErrorResponse when JTI already exists", async () => {
    const transactionError = new TransactionCanceledException({
      message: "Transaction cancelled",
      CancellationReasons: [{ Code: "ConditionalCheckFailed" }],
      $metadata: {},
    });
    mockTransactWrite.mockRejectedValue(transactionError);

    const result = await checkJtiUnusedAndSetUpSession(
      mockJti,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result?.errorResponse.statusCode).toBe(302);
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error_description=E2010",
    );
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "state=test-state",
    );
    expect(mockLogger.warn).toHaveBeenCalledWith("JTIAlreadyUsed", {
      client_id: mockClientId,
      jti: mockJti,
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
      CancellationReasons: [{ Code: "ConditionalCheckFailed" }],
      $metadata: {},
    });
    mockTransactWrite.mockRejectedValue(transactionError);

    const result = await checkJtiUnusedAndSetUpSession(
      mockJti,
      mockClientId,
      mockRedirectUri,
    );

    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result?.errorResponse.headers?.["location"]).not.toContain("state=");
  });

  it("returns ErrorResponse for other transaction errors", async () => {
    const transactionError = new TransactionCanceledException({
      message: "Transaction cancelled",
      CancellationReasons: [{ Code: "ValidationException" }],
      $metadata: {},
    });
    mockTransactWrite.mockRejectedValue(transactionError);

    const result = await checkJtiUnusedAndSetUpSession(
      mockJti,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error_description=E5001",
    );
    expect(mockLogger.warn).toHaveBeenCalledWith("FailedToSaveJTI", {
      client_id: mockClientId,
      jti: mockJti,
      error: transactionError,
    });
    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "FailedToSaveJTI",
      MetricUnit.Count,
      1,
    );
  });

  it("returns ErrorResponse for non-TransactionCanceledException errors", async () => {
    const genericError = new Error("Database connection failed");
    mockTransactWrite.mockRejectedValue(genericError);

    const result = await checkJtiUnusedAndSetUpSession(
      mockJti,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error_description=E5001",
    );
    expect(mockLogger.warn).toHaveBeenCalledWith("FailedToSaveJTI", {
      client_id: mockClientId,
      jti: mockJti,
      error: genericError,
    });
    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "FailedToSaveJTI",
      MetricUnit.Count,
      1,
    );
  });

  it("calculates correct expiry time", async () => {
    const customTtl = 600;
    mockGetAppConfig.mockResolvedValue({ jti_nonce_ttl_in_seconds: customTtl });
    mockTransactWrite.mockResolvedValue({});

    await checkJtiUnusedAndSetUpSession(
      mockJti,
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
              nonce: mockJti,
              expires: 1600,
            },
            ConditionExpression: "attribute_not_exists(nonce)",
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
      mockJti,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(mockLogger.warn).toHaveBeenCalledWith("FailedToSaveJTI", {
      client_id: mockClientId,
      jti: mockJti,
      error: transactionError,
    });
  });

  it("handles TransactionCanceledException with empty CancellationReasons", async () => {
    const transactionError = new TransactionCanceledException({
      message: "Transaction cancelled",
      CancellationReasons: [],
      $metadata: {},
    });
    mockTransactWrite.mockRejectedValue(transactionError);

    const result = await checkJtiUnusedAndSetUpSession(
      mockJti,
      mockClientId,
      mockRedirectUri,
      mockState,
    );

    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
  });
});
