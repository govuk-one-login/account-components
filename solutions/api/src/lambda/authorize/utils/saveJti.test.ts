import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

vi.mock(import("../../../../../commons/utils/logger/index.js"));
vi.mock(import("../../../../../commons/utils/metrics/index.js"));
vi.mock(
  import("../../../../../commons/utils/awsClient/dynamodbClient/index.js"),
);
vi.mock(import("../../../../../commons/utils/getAppConfig/index.js"));

const mockLogger = {
  warn: vi.fn(),
};

const mockMetrics = {
  addMetric: vi.fn(),
};

const mockDynamoDbClient = {
  transactWrite: vi.fn(),
};

const mockGetAppConfig = vi.fn();

const ORIGINAL_ENV = { ...process.env };

describe("saveJti", () => {
  beforeAll(() => {
    process.env["REPLAY_ATTACK_TABLE_NAME"] = "test-replay-attack-table";
    process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("../../../../../commons/utils/logger/index.js", () => ({
      logger: mockLogger,
    }));
    vi.doMock("../../../../../commons/utils/metrics/index.js", () => ({
      metrics: mockMetrics,
    }));
    vi.doMock(
      "../../../../../commons/utils/awsClient/dynamodbClient/index.js",
      () => ({
        getDynamoDbClient: vi.fn(() => mockDynamoDbClient),
      }),
    );
    vi.doMock("../../../../../commons/utils/getAppConfig/index.js", () => ({
      getAppConfig: mockGetAppConfig,
    }));
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("successfully saves JTI and returns undefined", async () => {
    const mockNow = 1640995200000;
    vi.spyOn(Date, "now").mockReturnValue(mockNow);

    mockGetAppConfig.mockResolvedValue({ jti_nonce_ttl_in_seconds: 300 });
    mockDynamoDbClient.transactWrite.mockResolvedValue({});

    const { saveJti } = await import("./saveJti.js");

    const result = await saveJti(
      "test-jti",
      "test-client",
      "https://example.com/callback",
    );

    const expectedExpiry = Math.floor(mockNow / 1000) + 300;

    expect(result).toBeUndefined();
    expect(mockDynamoDbClient.transactWrite).toHaveBeenCalledWith({
      TransactItems: [
        {
          Put: {
            TableName: "test-replay-attack-table",
            Item: {
              nonce: "test-jti",
              expires: expectedExpiry,
            },
            ConditionExpression: "attribute_not_exists(nonce)",
          },
        },
      ],
    });
  });

  it("calculates correct expiry time", async () => {
    const mockNow = 1640995200000;
    vi.spyOn(Date, "now").mockReturnValue(mockNow);

    mockGetAppConfig.mockResolvedValue({ jti_nonce_ttl_in_seconds: 300 });
    mockDynamoDbClient.transactWrite.mockResolvedValue({});

    const { saveJti } = await import("./saveJti.js");

    await saveJti("test-jti", "test-client", "https://example.com/callback");

    const expectedExpiry = Math.floor(mockNow / 1000) + 300;

    expect(mockDynamoDbClient.transactWrite).toHaveBeenCalledWith({
      TransactItems: [
        {
          Put: {
            TableName: "test-replay-attack-table",
            Item: {
              nonce: "test-jti",
              expires: expectedExpiry,
            },
            ConditionExpression: "attribute_not_exists(nonce)",
          },
        },
      ],
    });
  });

  it("returns ErrorResponse when JTI already exists", async () => {
    mockGetAppConfig.mockResolvedValue({ jti_nonce_ttl_in_seconds: 300 });

    const transactionError = new TransactionCanceledException({
      message: "Transaction cancelled",
      CancellationReasons: [{ Code: "ConditionalCheckFailed" }],
      $metadata: {},
    });
    mockDynamoDbClient.transactWrite.mockRejectedValue(transactionError);

    const { saveJti } = await import("./saveJti.js");

    const result = await saveJti(
      "duplicate-jti",
      "test-client",
      "https://example.com/callback",
      "test-state",
    );

    expect(result).toBeDefined();
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
      client_id: "test-client",
      jti: "duplicate-jti",
    });
    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "JTIAlreadyUsed",
      MetricUnit.Count,
      1,
    );
  });

  it("returns ErrorResponse when JTI already exists without state", async () => {
    mockGetAppConfig.mockResolvedValue({ jti_nonce_ttl_in_seconds: 300 });

    const transactionError = new TransactionCanceledException({
      message: "Transaction cancelled",
      CancellationReasons: [{ Code: "ConditionalCheckFailed" }],
      $metadata: {},
    });
    mockDynamoDbClient.transactWrite.mockRejectedValue(transactionError);

    const { saveJti } = await import("./saveJti.js");

    const result = await saveJti(
      "duplicate-jti",
      "test-client",
      "https://example.com/callback",
    );

    expect(result).toBeDefined();
    expect(result?.errorResponse.statusCode).toBe(302);
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error_description=E2010",
    );
    expect(result?.errorResponse.headers?.["location"]).not.toContain("state=");
  });

  it("returns ErrorResponse for other DynamoDB errors", async () => {
    mockGetAppConfig.mockResolvedValue({ jti_nonce_ttl_in_seconds: 300 });

    const genericError = new Error("DynamoDB service error");
    mockDynamoDbClient.transactWrite.mockRejectedValue(genericError);

    const { saveJti } = await import("./saveJti.js");

    const result = await saveJti(
      "test-jti",
      "test-client",
      "https://example.com/callback",
      "test-state",
    );

    expect(result).toBeDefined();
    expect(result?.errorResponse.statusCode).toBe(302);
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error_description=E5001",
    );
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "state=test-state",
    );

    expect(mockLogger.warn).toHaveBeenCalledWith("FailedToSaveJTI", {
      client_id: "test-client",
      jti: "test-jti",
      error: genericError,
    });
    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "FailedToSaveJTI",
      MetricUnit.Count,
      1,
    );
  });

  it("handles TransactionCanceledException without ConditionalCheckFailed", async () => {
    mockGetAppConfig.mockResolvedValue({ jti_nonce_ttl_in_seconds: 300 });

    const transactionError = new TransactionCanceledException({
      message: "Transaction cancelled",
      CancellationReasons: [{ Code: "ValidationException" }],
      $metadata: {},
    });
    mockDynamoDbClient.transactWrite.mockRejectedValue(transactionError);

    const { saveJti } = await import("./saveJti.js");

    const result = await saveJti(
      "test-jti",
      "test-client",
      "https://example.com/callback",
    );

    expect(result).toBeDefined();
    expect(result?.errorResponse.statusCode).toBe(302);
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error_description=E5001",
    );

    expect(mockLogger.warn).toHaveBeenCalledWith("FailedToSaveJTI", {
      client_id: "test-client",
      jti: "test-jti",
      error: transactionError,
    });
    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "FailedToSaveJTI",
      MetricUnit.Count,
      1,
    );
  });

  it("handles TransactionCanceledException with no CancellationReasons", async () => {
    mockGetAppConfig.mockResolvedValue({ jti_nonce_ttl_in_seconds: 300 });

    const transactionError = new TransactionCanceledException({
      message: "Transaction cancelled",
      $metadata: {},
    });
    mockDynamoDbClient.transactWrite.mockRejectedValue(transactionError);

    const { saveJti } = await import("./saveJti.js");

    const result = await saveJti(
      "test-jti",
      "test-client",
      "https://example.com/callback",
    );

    expect(result).toBeDefined();
    expect(result?.errorResponse.statusCode).toBe(302);
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(result?.errorResponse.headers?.["location"]).toContain(
      "error_description=E5001",
    );
  });
});
