import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import type {
  Claims,
  getClaimsSchema,
} from "../../../../commons/utils/authorize/getClaimsSchema.js";
import type * as v from "valibot";

const mockTransactWrite = vi.fn();
const mockRandomBytes = vi.fn();
const mockGetAppConfig = vi.fn();
const mockRedirectToClientRedirectUri = vi.fn();
const mockAddMetric = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: vi.fn(() => ({
      transactWrite: mockTransactWrite,
    })),
  }),
);

vi.mock(import("node:crypto"), () => ({
  randomBytes: mockRandomBytes,
}));

vi.mock(import("../../../../commons/utils/getAppConfig/index.js"), () => ({
  getAppConfig: mockGetAppConfig,
}));

vi.mock(import("../../utils/redirectToClientRedirectUri.js"), () => ({
  redirectToClientRedirectUri: mockRedirectToClientRedirectUri,
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: { addMetric: mockAddMetric },
}));

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/authorize/authorizeErrors.js"),
  () => ({
    authorizeErrors: {
      failedToCompleteJourney: {
        error: "server_error",
        error_description: "E5001",
      },
    },
  }),
);

describe("completeJourney", () => {
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;
  let mockClaims: Claims;
  let mockJourneyOutcomeDetails: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      log: { warn: vi.fn() },
    } as unknown as FastifyRequest;

    mockReply = {} as unknown as FastifyReply;

    mockClaims = {
      scope: "testing-journey",
      sub: "test-sub",
      email: "test@example.com",
      client_id: "test-client-id",
      redirect_uri: "https://example.com/callback",
      state: "test-state",
    } as v.InferOutput<ReturnType<typeof getClaimsSchema>>;

    mockJourneyOutcomeDetails = { result: "success" };

    process.env["JOURNEY_OUTCOME_TABLE_NAME"] = "test-outcome-table";
    process.env["AUTH_CODE_TABLE_NAME"] = "test-auth-code-table";
  });

  it("successfully completes journey and redirects with auth code", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockRedirectToClientRedirectUri.mockResolvedValue(mockReply);

    const module = await import("./completeJourney.js");
    const result = await module.completeJourney(
      mockRequest,
      mockReply,
      mockClaims,
      mockJourneyOutcomeDetails,
    );

    expect(mockRandomBytes).toHaveBeenCalledTimes(2);
    expect(mockRandomBytes).toHaveBeenCalledWith(24);
    expect(mockGetAppConfig).toHaveBeenCalledWith();
    expect(mockTransactWrite).toHaveBeenCalledWith({
      TransactItems: [
        {
          Put: {
            TableName: "test-outcome-table",
            Item: {
              outcome_id: mockOutcomeId,
              sub: mockClaims.sub,
              email: mockClaims.email,
              scope: mockClaims.scope,
              success: true,
              journeys: [
                {
                  journey: mockClaims.scope,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                  timestamp: expect.any(Number),
                  success: true,
                  details: mockJourneyOutcomeDetails,
                },
              ],
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              expires: expect.any(Number),
            },
          },
        },
        {
          Put: {
            TableName: "test-auth-code-table",
            Item: {
              code: mockAuthCode,
              outcome_id: mockOutcomeId,
              client_id: mockClaims.client_id,
              sub: mockClaims.sub,
              redirect_uri: mockClaims.redirect_uri,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              expires: expect.any(Number),
            },
          },
        },
      ],
    });
    expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
      mockRequest,
      mockReply,
      mockClaims.redirect_uri,
      undefined,
      mockClaims.state,
      mockAuthCode,
    );
    expect(result).toBe(mockReply);
  });

  it("handles DynamoDB transaction failure and redirects with error", async () => {
    const mockError = new Error("DynamoDB error");

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => "auth-code") })
      .mockReturnValueOnce({ toString: vi.fn(() => "outcome-id") });
    mockGetAppConfig.mockResolvedValue({
      auth_code_ttl: 300,
      journey_outcome_ttl: 600,
    });
    mockTransactWrite.mockRejectedValue(mockError);
    mockRedirectToClientRedirectUri.mockResolvedValue(mockReply);

    const module = await import("./completeJourney.js");
    const result = await module.completeJourney(
      mockRequest,
      mockReply,
      mockClaims,
      mockJourneyOutcomeDetails,
    );

    expect(mockRequest.log.warn).toHaveBeenCalledWith(
      { error: mockError },
      "FailedToCompleteJourney",
    );
    expect(mockAddMetric).toHaveBeenCalledWith(
      "FailedToCompleteJourney",
      MetricUnit.Count,
      1,
    );
    expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
      mockRequest,
      mockReply,
      mockClaims.redirect_uri,
      expect.objectContaining({
        error: "server_error",
        error_description: "E5001",
      }),
      mockClaims.state,
    );
    expect(result).toBe(mockReply);
  });

  it("handles getAppConfig failure and redirects with error", async () => {
    const mockError = new Error("Config error");

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => "auth-code") })
      .mockReturnValueOnce({ toString: vi.fn(() => "outcome-id") });
    mockGetAppConfig.mockRejectedValue(mockError);
    mockRedirectToClientRedirectUri.mockResolvedValue(mockReply);

    const module = await import("./completeJourney.js");
    const result = await module.completeJourney(
      mockRequest,
      mockReply,
      mockClaims,
      mockJourneyOutcomeDetails,
    );

    expect(mockRequest.log.warn).toHaveBeenCalledWith(
      { error: mockError },
      "FailedToCompleteJourney",
    );
    expect(mockAddMetric).toHaveBeenCalledWith(
      "FailedToCompleteJourney",
      MetricUnit.Count,
      1,
    );
    expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
      mockRequest,
      mockReply,
      mockClaims.redirect_uri,
      expect.objectContaining({
        error: "server_error",
        error_description: "E5001",
      }),
      mockClaims.state,
    );
    expect(result).toBe(mockReply);
  });

  it("calculates correct expiry time for auth code", async () => {
    const mockAuthCode = "auth-code";
    const mockOutcomeId = "outcome-id";
    const mockAppConfig = { auth_code_ttl: 600, journey_outcome_ttl: 1200 };
    const mockNow = 1640995200000;

    const dateNowSpy = vi.spyOn(Date, "now");
    dateNowSpy.mockReturnValue(mockNow);
    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockRedirectToClientRedirectUri.mockResolvedValue(mockReply);

    const module = await import("./completeJourney.js");
    await module.completeJourney(
      mockRequest,
      mockReply,
      mockClaims,
      mockJourneyOutcomeDetails,
    );

    expect(mockTransactWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        TransactItems: expect.arrayContaining([
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            Put: expect.objectContaining({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              Item: expect.objectContaining({
                expires: 1640995800,
              }),
            }),
          }),
        ]),
      }),
    );

    dateNowSpy.mockRestore();
  });
});
