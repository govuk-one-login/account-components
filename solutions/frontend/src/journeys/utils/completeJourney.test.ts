import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Claims, getClaimsSchema } from "../../utils/getClaimsSchema.js";
import type * as v from "valibot";

const mockTransactWrite = vi.fn();
const mockRandomBytes = vi.fn();
const mockGetAppConfig = vi.fn();
const mockBuildRedirectToClientRedirectUri = vi.fn();
const mockRedirect = vi.fn();
const mockAddMetric = vi.fn();
const mockDestroySession = vi.fn();
const mockSendAuditEvent = vi.fn();
const mockGetCommonAuditEventProps = vi.fn();
const mockCreateEvent = vi.fn();

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

vi.mock(import("../../utils/buildRedirectToClientRedirectUri.js"), () => ({
  buildRedirectToClientRedirectUri: mockBuildRedirectToClientRedirectUri,
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: {
    addMetric: mockAddMetric,
  },
}));

vi.mock(import("../../utils/session.js"), () => ({
  destroySession: mockDestroySession,
}));

vi.mock(import("../../../../commons/utils/auditEvents/index.js"), () => ({
  sendAuditEvent: mockSendAuditEvent,
  getCommonAuditEventProps: mockGetCommonAuditEventProps,
}));

vi.mock(import("@govuk-one-login/event-catalogue-utils"), () => ({
  createEvent: mockCreateEvent,
}));

const mockNow = 1640995200000;

describe("completeJourney", () => {
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;
  let mockClaims: Claims;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ now: mockNow });

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

    mockRedirect.mockReturnValue(mockReply);

    process.env["JOURNEY_OUTCOME_TABLE_NAME"] = "test-outcome-table";
    process.env["AUTH_CODE_TABLE_NAME"] = "test-auth-code-table";
  });

  it("successfully completes journey and redirects with auth code", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };
    const mockRedirectUrl =
      "https://example.com/callback?code=mock-auth-code-hex&state=test-state";

    mockRequest.session.journeyActions = [
      {
        action: "testing-journey-action",
        success: true,
        details: {},
        timestamp: 1000,
      },
    ];

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockBuildRedirectToClientRedirectUri.mockReturnValue(mockRedirectUrl);

    const module = await import("./completeJourney.js");
    const result = await module.completeJourney(mockRequest, mockReply, true);

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
              actions: [
                {
                  action: "testing-journey-action",
                  success: true,
                  details: {},
                  timestamp: 1000,
                },
              ],
              expires: Math.floor(mockNow / 1000) + 600,
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
              expires: Math.floor(mockNow / 1000) + 300,
            },
          },
        },
      ],
    });
    expect(mockAddMetric).toHaveBeenCalledWith(
      "JourneyCompletedSuccessfully",
      "Count",
      1,
    );
    expect(mockRequest.session.completedJourneyOutcomeId).toBe(mockOutcomeId);
    expect(mockBuildRedirectToClientRedirectUri).toHaveBeenCalledWith(
      mockClaims.redirect_uri,
      undefined,
      mockClaims.state,
      mockAuthCode,
    );
    expect(mockRedirect).toHaveBeenCalledWith(mockRedirectUrl);
    expect(result).toBe(mockReply);
  });

  it("does not destroy session when no action has destroySession true", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };
    const mockRedirectUrl =
      "https://example.com/callback?code=mock-auth-code-hex&state=test-state";

    mockRequest.session.journeyActions = [
      {
        action: "testing-journey-action",
        success: true,
        details: {},
        timestamp: 1000,
      },
    ];

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockBuildRedirectToClientRedirectUri.mockReturnValue(mockRedirectUrl);

    const module = await import("./completeJourney.js");
    await module.completeJourney(mockRequest, mockReply, true);

    expect(mockDestroySession).not.toHaveBeenCalled();
  });

  it("destroys session when an action has error with destroySession true", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };
    const mockRedirectUrl =
      "https://example.com/callback?code=mock-auth-code-hex&state=test-state";

    mockRequest.session.journeyActions = [
      {
        action: "account-delete",
        success: false,
        error: {
          code: 1001,
          description: "UserSignedOut",
          destroySession: true,
        },
        timestamp: 1000,
      },
    ];

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockBuildRedirectToClientRedirectUri.mockReturnValue(mockRedirectUrl);

    const module = await import("./completeJourney.js");
    await module.completeJourney(mockRequest, mockReply, false);

    expect(mockDestroySession).toHaveBeenCalledWith(mockRequest);
    expect(mockAddMetric).toHaveBeenCalledWith(
      "JourneyCompletedUnsuccessfully",
      "Count",
      1,
    );
    expect(mockRequest.session.completedJourneyOutcomeId).toBe(mockOutcomeId);
  });

  it("strips destroySession from error when writing to DynamoDB", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };
    const mockRedirectUrl =
      "https://example.com/callback?code=mock-auth-code-hex&state=test-state";

    mockRequest.session.journeyActions = [
      {
        action: "account-delete",
        success: false,
        error: {
          code: 1001,
          description: "UserSignedOut",
          destroySession: true,
        },
        timestamp: 1000,
      },
    ];

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockBuildRedirectToClientRedirectUri.mockReturnValue(mockRedirectUrl);

    const module = await import("./completeJourney.js");
    await module.completeJourney(mockRequest, mockReply, false);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const writtenActions = mockTransactWrite.mock.calls[0]?.[0].TransactItems[0]
      .Put.Item.actions as unknown[];

    expect(writtenActions).toStrictEqual([
      {
        action: "account-delete",
        success: false,
        error: {
          code: 1001,
          description: "UserSignedOut",
        },
        timestamp: 1000,
      },
    ]);
  });

  it("does not destroy session when action has error with destroySession false", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };
    const mockRedirectUrl =
      "https://example.com/callback?code=mock-auth-code-hex&state=test-state";

    mockRequest.session.journeyActions = [
      {
        action: "account-delete",
        success: false,
        error: {
          code: 1002,
          description: "UserAbortedJourney",
          destroySession: false,
        },
        timestamp: 1000,
      },
    ];

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockBuildRedirectToClientRedirectUri.mockReturnValue(mockRedirectUrl);

    const module = await import("./completeJourney.js");
    await module.completeJourney(mockRequest, mockReply, false);

    expect(mockDestroySession).not.toHaveBeenCalled();
    expect(mockAddMetric).toHaveBeenCalledWith(
      "JourneyCompletedUnsuccessfully",
      "Count",
      1,
    );
  });

  it("throws when there are no journey actions", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);

    const module = await import("./completeJourney.js");

    await expect(
      module.completeJourney(mockRequest, mockReply, false),
    ).rejects.toThrow("There are no journey actions");
  });

  it("throws when not all actions are completed", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };

    mockRequest.session.journeyActions = [{ action: "account-delete" }];

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);

    const module = await import("./completeJourney.js");

    await expect(
      module.completeJourney(mockRequest, mockReply, false),
    ).rejects.toThrow("Not all actions are completed");
  });

  it("skips journey outcome write, metrics, and session destroy when journey already completed", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const existingOutcomeId = "existing-outcome-id";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };
    const mockRedirectUrl =
      "https://example.com/callback?code=mock-auth-code-hex&state=test-state";

    mockRandomBytes.mockReturnValueOnce({
      toString: vi.fn(() => mockAuthCode),
    });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockBuildRedirectToClientRedirectUri.mockReturnValue(mockRedirectUrl);

    const module = await import("./completeJourney.js");
    const result = await module.completeJourney(
      mockRequest,
      mockReply,
      existingOutcomeId,
    );

    expect(mockRandomBytes).toHaveBeenCalledTimes(1);
    expect(mockTransactWrite).toHaveBeenCalledWith({
      TransactItems: [
        {
          Put: {
            TableName: "test-auth-code-table",
            Item: {
              code: mockAuthCode,
              outcome_id: existingOutcomeId,
              client_id: mockClaims.client_id,
              sub: mockClaims.sub,
              redirect_uri: mockClaims.redirect_uri,
              expires: Math.floor(mockNow / 1000) + 300,
            },
          },
        },
      ],
    });
    expect(mockAddMetric).not.toHaveBeenCalled();
    expect(mockDestroySession).not.toHaveBeenCalled();
    expect(mockSendAuditEvent).not.toHaveBeenCalled();
    expect(mockRequest.session.completedJourneyOutcomeId).toBeUndefined();
    expect(mockRedirect).toHaveBeenCalledWith(mockRedirectUrl);
    expect(result).toBe(mockReply);
  });

  it("sends AMC_COMPLETED audit event when awsLambda event is present", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };
    const mockRedirectUrl =
      "https://example.com/callback?code=mock-auth-code-hex&state=test-state";

    mockRequest.session.journeyActions = [
      {
        action: "testing-journey-action",
        success: true,
        details: {},
        timestamp: 1000,
      },
    ];
    (mockRequest as unknown as { awsLambda: unknown }).awsLambda = {
      event: { requestContext: {} },
    };
    (mockReply as unknown as { journeyCategory: string }).journeyCategory =
      "test-category";
    (mockClaims as unknown as { public_sub: string }).public_sub =
      "public-sub-123";

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockBuildRedirectToClientRedirectUri.mockReturnValue(mockRedirectUrl);
    mockGetCommonAuditEventProps.mockReturnValue({
      user: { session_id: "session-123" },
    });
    mockCreateEvent.mockReturnValue({ event_name: "AMC_COMPLETED" });
    mockSendAuditEvent.mockResolvedValue(undefined);

    const module = await import("./completeJourney.js");
    await module.completeJourney(mockRequest, mockReply, true);

    expect(mockCreateEvent).toHaveBeenCalledWith(
      "AMC_COMPLETED",
      expect.objectContaining({
        event_name: "AMC_COMPLETED",
        client_id: "test-client-id",
        extensions: expect.objectContaining({
          amc_scope: "testing-journey",
          "journey-type": "test-category",
          account_actions: ["testing-journey-action"],
          account_actions_errors: [],
          account_actions_failed: [],
          account_action_overall_outcome: true,
        }),
      }),
    );
    expect(mockSendAuditEvent).toHaveBeenCalledWith(expect.anything());
  });

  it("includes failed action errors in AMC_COMPLETED audit event", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };
    const mockRedirectUrl =
      "https://example.com/callback?code=mock-auth-code-hex&state=test-state";

    mockRequest.session.journeyActions = [
      {
        action: "account-delete",
        success: false,
        error: {
          code: 1001,
          description: "UserSignedOut",
          destroySession: true,
        },
        timestamp: 1000,
      },
    ];
    (mockRequest as unknown as { awsLambda: unknown }).awsLambda = {
      event: { requestContext: {} },
    };
    (mockReply as unknown as { journeyCategory: string }).journeyCategory =
      "test-category";
    (mockClaims as unknown as { public_sub: string }).public_sub =
      "public-sub-123";

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockBuildRedirectToClientRedirectUri.mockReturnValue(mockRedirectUrl);
    mockGetCommonAuditEventProps.mockReturnValue({
      user: { session_id: "session-123" },
    });
    mockCreateEvent.mockReturnValue({ event_name: "AMC_COMPLETED" });
    mockSendAuditEvent.mockResolvedValue(undefined);

    const module = await import("./completeJourney.js");
    await module.completeJourney(mockRequest, mockReply, false);

    expect(mockCreateEvent).toHaveBeenCalledWith(
      "AMC_COMPLETED",
      expect.objectContaining({
        extensions: expect.objectContaining({
          account_actions: ["account-delete"],
          account_actions_errors: ["UserSignedOut"],
          account_actions_failed: ["account-delete"],
          account_action_overall_outcome: false,
        }),
      }),
    );
  });

  it("includes multiple errors and failed actions in AMC_COMPLETED audit event", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };
    const mockRedirectUrl =
      "https://example.com/callback?code=mock-auth-code-hex&state=test-state";

    mockRequest.session.journeyActions = [
      {
        action: "account-delete",
        success: false,
        error: {
          code: 1001,
          description: "UserSignedOut",
          destroySession: true,
        },
        timestamp: 1000,
      },
      {
        action: "passkey-create",
        success: false,
        error: {
          code: 1002,
          description: "UserAbortedJourney",
          destroySession: false,
        },
        timestamp: 2000,
      },
    ];
    (mockRequest as unknown as { awsLambda: unknown }).awsLambda = {
      event: { requestContext: {} },
    };
    (mockReply as unknown as { journeyCategory: string }).journeyCategory =
      "test-category";
    (mockClaims as unknown as { public_sub: string }).public_sub =
      "public-sub-123";

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockBuildRedirectToClientRedirectUri.mockReturnValue(mockRedirectUrl);
    mockGetCommonAuditEventProps.mockReturnValue({
      user: { session_id: "session-123" },
    });
    mockCreateEvent.mockReturnValue({ event_name: "AMC_COMPLETED" });
    mockSendAuditEvent.mockResolvedValue(undefined);

    const module = await import("./completeJourney.js");
    await module.completeJourney(mockRequest, mockReply, false);

    expect(mockCreateEvent).toHaveBeenCalledWith(
      "AMC_COMPLETED",
      expect.objectContaining({
        extensions: expect.objectContaining({
          account_actions: ["account-delete", "passkey-create"],
          account_actions_errors: ["UserSignedOut", "UserAbortedJourney"],
          account_actions_failed: ["account-delete", "passkey-create"],
          account_action_overall_outcome: false,
        }),
      }),
    );
  });

  it("does not send audit event when awsLambda event is not present", async () => {
    const mockAuthCode = "mock-auth-code-hex";
    const mockOutcomeId = "mock-outcome-id-hex";
    const mockAppConfig = { auth_code_ttl: 300, journey_outcome_ttl: 600 };
    const mockRedirectUrl =
      "https://example.com/callback?code=mock-auth-code-hex&state=test-state";

    mockRequest.session.journeyActions = [
      {
        action: "testing-journey-action",
        success: true,
        details: {},
        timestamp: 1000,
      },
    ];

    mockRandomBytes
      .mockReturnValueOnce({ toString: vi.fn(() => mockAuthCode) })
      .mockReturnValueOnce({ toString: vi.fn(() => mockOutcomeId) });
    mockGetAppConfig.mockResolvedValue(mockAppConfig);
    mockTransactWrite.mockResolvedValue({});
    mockBuildRedirectToClientRedirectUri.mockReturnValue(mockRedirectUrl);

    const module = await import("./completeJourney.js");
    await module.completeJourney(mockRequest, mockReply, true);

    expect(mockSendAuditEvent).not.toHaveBeenCalled();
  });
});
