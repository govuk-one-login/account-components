import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  Claims,
  getClaimsSchema,
} from "../../../../commons/utils/authorize/getClaimsSchema.js";
import type * as v from "valibot";

const mockTransactWrite = vi.fn();
const mockRandomBytes = vi.fn();
const mockGetAppConfig = vi.fn();
const mockBuildRedirectToClientRedirectUri = vi.fn();
const mockDestroySession = vi.fn();
const mockDestroyApiSession = vi.fn();
const mockRedirect = vi.fn();

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

vi.mock(
  import("../../../../commons/utils/authorize/buildRedirectToClientRedirectUri.js"),
  () => ({
    buildRedirectToClientRedirectUri: mockBuildRedirectToClientRedirectUri,
  }),
);

vi.mock(import("../../utils/session.js"), () => ({
  destroySession: mockDestroySession,
}));

vi.mock(import("../../utils/apiSession.js"), () => ({
  destroyApiSession: mockDestroyApiSession,
}));

describe("completeJourney", () => {
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;
  let mockClaims: Claims;
  let mockJourneyOutcomeDetails: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      session: { claims: {} },
    } as unknown as FastifyRequest;

    mockReply = {
      redirect: mockRedirect,
    } as unknown as FastifyReply;

    mockClaims = {
      scope: "testing-journey",
      sub: "test-sub",
      email: "test@example.com",
      client_id: "test-client-id",
      redirect_uri: "https://example.com/callback",
      state: "test-state",
    } as v.InferOutput<ReturnType<typeof getClaimsSchema>>;

    mockRequest.session.claims = mockClaims;

    mockJourneyOutcomeDetails = { result: "success" };

    mockRedirect.mockReturnValue(mockReply);
    mockDestroySession.mockResolvedValue(undefined);
    mockDestroyApiSession.mockResolvedValue(undefined);

    process.env["JOURNEY_OUTCOME_TABLE_NAME"] = "test-outcome-table";
    process.env["AUTH_CODE_TABLE_NAME"] = "test-auth-code-table";
  });

  it("successfully completes journey and redirects with auth code", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };
    const mockRedirectUrl =
      "https://example.com/callback?code=mock-auth-code-hex&state=test-state";

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockBuildRedirectToClientRedirectUri.mockReturnValue(mockRedirectUrl);

    const module = await import("./completeJourney.js");
    const result = await module.completeJourney(
      mockRequest,
      mockReply,
      mockJourneyOutcomeDetails,
      true,
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
    expect(mockDestroyApiSession).toHaveBeenCalledWith(mockRequest, mockReply);
    expect(mockDestroySession).toHaveBeenCalledWith(mockRequest);
    expect(mockBuildRedirectToClientRedirectUri).toHaveBeenCalledWith(
      mockClaims.redirect_uri,
      undefined,
      mockClaims.state,
      mockAuthCode,
    );
    expect(mockRedirect).toHaveBeenCalledWith(mockRedirectUrl);
    expect(result).toBe(mockReply);
  });

  it("successfully completes journey with failure and redirects with auth code", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };
    const mockRedirectUrl =
      "https://example.com/callback?code=mock-auth-code-hex&state=test-state";
    const mockErrorDetails = { code: 1001, description: "Test error" };

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockBuildRedirectToClientRedirectUri.mockReturnValue(mockRedirectUrl);

    const module = await import("./completeJourney.js");
    const result = await module.completeJourney(
      mockRequest,
      mockReply,
      mockErrorDetails,
      false,
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
              success: false,
              journeys: [
                {
                  journey: mockClaims.scope,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                  timestamp: expect.any(Number),
                  success: false,
                  details: {
                    error: mockErrorDetails,
                  },
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
    expect(mockDestroyApiSession).toHaveBeenCalledWith(mockRequest, mockReply);
    expect(mockDestroySession).toHaveBeenCalledWith(mockRequest);
    expect(mockBuildRedirectToClientRedirectUri).toHaveBeenCalledWith(
      mockClaims.redirect_uri,
      undefined,
      mockClaims.state,
      mockAuthCode,
    );
    expect(mockRedirect).toHaveBeenCalledWith(mockRedirectUrl);
    expect(result).toBe(mockReply);
  });

  it("calculates correct expiry time for auth code", async () => {
    const mockAuthCode = "auth-code";
    const mockOutcomeId = "outcome-id";
    const mockAppConfig = { auth_code_ttl: 600, journey_outcome_ttl: 1200 };
    const mockNow = 1640995200000;
    const mockRedirectUrl =
      "https://example.com/callback?code=auth-code&state=test-state";

    const dateNowSpy = vi.spyOn(Date, "now");
    dateNowSpy.mockReturnValue(mockNow);
    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockBuildRedirectToClientRedirectUri.mockReturnValue(mockRedirectUrl);

    const module = await import("./completeJourney.js");
    await module.completeJourney(
      mockRequest,
      mockReply,
      mockJourneyOutcomeDetails,
      true,
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
