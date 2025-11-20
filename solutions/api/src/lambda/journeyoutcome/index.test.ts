import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy.js";
import type { Context } from "aws-lambda";
import type { CryptoKey } from "jose";
import type { JourneyInfoPayload } from "./utils/validateJourneyOutcomeJwtClaims.js";

const mockContext = {} as unknown as Context;

const mockMetrics = {
  addMetric: vi.fn(),
  addDimensions: vi.fn(),
};

vi.mock(import("./utils/verifySignatureAndGetPayload.js"));
const mockverifySignatureAndGetPayload = vi.mocked(
  await import("./utils/verifySignatureAndGetPayload.js"),
).verifySignatureAndGetPayload;

vi.mock(import("./utils/validateJourneyOutcomeJwtClaims.js"));
const mockValidateJourneyOutcomeJwtClaims = vi.mocked(
  await import("./utils/validateJourneyOutcomeJwtClaims.js"),
).validateJourneyOutcomeJwtClaims;

vi.mock(import("./utils/getKmsKey.js"));
const mockGetKmsKey = vi.mocked(await import("./utils/getKmsKey.js")).getKMSKey;

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: mockMetrics,
  flushMetricsAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

const { handler } = await import("./index.js");

describe("journeyoutcome handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["JWT_SIGNING_KEY_ALIAS"] = "test-alias";
  });

  it("returns 200 status for valid Authorization header with access token", async () => {
    mockverifySignatureAndGetPayload.mockResolvedValue(
      {} as any as JourneyInfoPayload,
    );
    mockValidateJourneyOutcomeJwtClaims.mockResolvedValue(undefined);
    mockGetKmsKey.mockResolvedValue({} as any as CryptoKey);

    const mockValidEvent = {
      headers: { Authorization: "Bearer blah" },
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(mockValidEvent, mockContext);

    expect(result).toStrictEqual({
      statusCode: 200,
      body: '"hello world"',
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
