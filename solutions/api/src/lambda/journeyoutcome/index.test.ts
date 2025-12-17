import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy.js";
import type { Context } from "aws-lambda";
import type { CryptoKey } from "jose";
import type {
  JourneyOutcome,
  JourneyOutcomePayload,
} from "./utils/interfaces.js";

const mockContext = {} as unknown as Context;

const mockMetrics = {
  addMetric: vi.fn(),
  addDimensions: vi.fn(),
};

const mockLogger = {
  appendKeys: vi.fn(),
};

const mockOutcomeData = [
  { step: 1, action: "start" },
  { step: 2, action: "complete" },
] as unknown as JourneyOutcome;

vi.mock(import("./utils/verifySignatureAndGetPayload.js"));
const mockverifySignatureAndGetPayload = vi.mocked(
  await import("./utils/verifySignatureAndGetPayload.js"),
).verifySignatureAndGetPayload;

vi.mock(import("./utils/validateJourneyOutcomeJwtClaims.js"));
const mockValidateJourneyOutcomeJwtClaims = vi.mocked(
  await import("./utils/validateJourneyOutcomeJwtClaims.js"),
).validateJourneyOutcomeJwtClaims;

vi.mock(import("./utils/getJourneyOutcome.js"));
const mockGetJourneyOutcome = vi.mocked(
  await import("./utils/getJourneyOutcome.js"),
).getJourneyOutcome;

vi.mock(import("./utils/getKmsKey.js"));
const mockGetKmsKey = vi.mocked(await import("./utils/getKmsKey.js")).getKMSKey;

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: mockMetrics,
  metricsAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/logger/index.js"), () => ({
  logger: { ...mockLogger, warn: vi.fn(), debug: vi.fn() },
  loggerAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/awsClient/tracer.js"), () => ({
  tracer: { captureLambdaHandler: (fn) => fn },
}));

const { handler } = await import("./index.js");

describe("journeyoutcome handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["JWT_SIGNING_KEY_ALIAS"] = "test-alias";
    process.env["JOURNEY_OUTCOME_TABLE_NAME"] = "test-table-name";
  });

  it("returns 200 status with outcome object for valid Authorization header with valid access_token containing a valid outcome_id", async () => {
    mockverifySignatureAndGetPayload.mockResolvedValue(
      {} as any as JourneyOutcomePayload,
    );
    mockValidateJourneyOutcomeJwtClaims.mockResolvedValue(undefined);
    mockGetKmsKey.mockResolvedValue({} as any as CryptoKey);
    mockGetJourneyOutcome.mockResolvedValue(mockOutcomeData);

    const mockValidEvent = {
      headers: { Authorization: "Bearer blah" },
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(mockValidEvent, mockContext);

    expect(result).toStrictEqual({
      statusCode: 200,
      body: JSON.stringify(mockOutcomeData),
    });
  });

  it("returns 400 status with error for missing Authorization header", async () => {
    const mockInvalidEvent = {
      headers: { foo: "bar" },
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(mockInvalidEvent, mockContext);

    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "InvalidAuthorizationHeader",
      "Count",
      1,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4006",
      }),
    });
  });

  it("returns 400 status with error for invalid Authorization header without a Bearer prefix", async () => {
    const mockInvalidEvent = {
      headers: { foo: "bar", Authorization: "blahhhhh" },
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(mockInvalidEvent, mockContext);

    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "InvalidAuthorizationHeader",
      "Count",
      1,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4006",
      }),
    });
  });

  it("returns 400 status with error for invalid Authorization header without a token", async () => {
    const mockInvalidEvent = {
      headers: { foo: "bar", Authorization: "Bearer " },
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(mockInvalidEvent, mockContext);

    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "InvalidAuthorizationHeader",
      "Count",
      1,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4006",
      }),
    });
  });
});
