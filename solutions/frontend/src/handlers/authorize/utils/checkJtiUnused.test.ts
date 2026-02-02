import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  beforeAll,
  afterEach,
} from "vitest";
import type { checkJtiUnused as checkJtiUnusedForType } from "./checkJtiUnused.js";
import { ErrorResponse } from "./common.js";
import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import type { FastifyReply } from "fastify";
import type { Claims } from "../../../utils/getClaimsSchema.js";

vi.mock(import("./common.js"), async () => {
  process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";
  return await vi.importActual("./common.js");
});

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/logger/index.js"), () => ({
  logger: { warn: vi.fn() },
}));

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/metrics/index.js"), () => ({
  metrics: { addMetric: vi.fn() },
}));

const mockTransactWrite = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: vi.fn(() => ({
      transactWrite: mockTransactWrite,
    })),
  }),
);

const mockGetAppConfig = vi.fn();

vi.mock(import("../../../../../commons/utils/getAppConfig/index.js"), () => ({
  getAppConfig: mockGetAppConfig,
}));

let checkJtiUnused: typeof checkJtiUnusedForType;

describe("checkJtiUnused", () => {
  const clientId = "test-client";
  const redirectUri = "https://example.com/callback";
  const state = "test-state";
  const claims = {
    jti: "unique-jti-123",
    aud: clientId,
    iss: "https://example.com",
  } as Claims;
  const reply = {
    redirect: vi.fn(),
  } as unknown as FastifyReply;

  beforeAll(async () => {
    process.env["REPLAY_ATTACK_TABLE_NAME"] = "test-replay-table";
    const checkJtiUnusedModule = await import("./checkJtiUnused.js");
    checkJtiUnused = checkJtiUnusedModule.checkJtiUnused;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    mockGetAppConfig.mockResolvedValue({
      jti_nonce_ttl_in_seconds: 3600,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("successfully stores JTI when unused", async () => {
    mockTransactWrite.mockResolvedValue({});

    const result = await checkJtiUnused(
      reply,
      claims,
      clientId,
      redirectUri,
      state,
    );

    expect(result).toBeUndefined();
    expect(mockTransactWrite).toHaveBeenCalledWith({
      TransactItems: [
        {
          Put: {
            TableName: "test-replay-table",
            Item: {
              nonce: "unique-jti-123",
              expires: 1704067200 + 3600,
            },
            ConditionExpression: "attribute_not_exists(nonce)",
          },
        },
      ],
    });
  });

  it("returns ErrorResponse when JTI already used", async () => {
    const error = new TransactionCanceledException({
      message: "Transaction cancelled",
      $metadata: {},
    });
    error.CancellationReasons = [{ Code: "ConditionalCheckFailed" }];
    mockTransactWrite.mockRejectedValue(error);

    const result = await checkJtiUnused(
      reply,
      claims,
      clientId,
      redirectUri,
      state,
    );

    expect(result).toBeInstanceOf(ErrorResponse);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(vi.mocked(reply.redirect).mock.calls[0]?.[0]).toContain(
      "error=invalid_request",
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(vi.mocked(reply.redirect).mock.calls[0]?.[0]).toContain(
      "error_description=E1010",
    );
  });

  it("returns ErrorResponse on DynamoDB error", async () => {
    mockTransactWrite.mockRejectedValue(new Error("DynamoDB error"));

    const result = await checkJtiUnused(
      reply,
      claims,
      clientId,
      redirectUri,
      state,
    );

    expect(result).toBeInstanceOf(ErrorResponse);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(vi.mocked(reply.redirect).mock.calls[0]?.[0]).toContain(
      "error=server_error",
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(vi.mocked(reply.redirect).mock.calls[0]?.[0]).toContain(
      "error_description=E3001",
    );
  });

  it("works without state parameter", async () => {
    mockTransactWrite.mockResolvedValue({});

    const result = await checkJtiUnused(reply, claims, clientId, redirectUri);

    expect(result).toBeUndefined();
  });

  it("includes state in error response when provided", async () => {
    mockTransactWrite.mockRejectedValue(new Error("DynamoDB error"));

    const result = await checkJtiUnused(
      reply,
      claims,
      clientId,
      redirectUri,
      state,
    );

    expect(result).toBeInstanceOf(ErrorResponse);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(vi.mocked(reply.redirect).mock.calls[0]?.[0]).toContain(
      `state=${state}`,
    );
  });
});
