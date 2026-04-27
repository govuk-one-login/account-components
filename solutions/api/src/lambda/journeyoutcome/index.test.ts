import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy.js";
import type { Context } from "aws-lambda";
import type { CryptoKey } from "jose";
import type { JourneyOutcomePayload } from "./utils/interfaces.js";
import type { JourneyOutcome } from "../../../../commons/utils/commonTypes.js";

const mockContext = {} as unknown as Context;

const mockMetrics = vi.mocked(
  await import("../../../../commons/utils/metrics/index.js"),
).metrics;

const mockOutcomeData = [
  { step: 1, action: "start" },
  { step: 2, action: "complete" },
] as unknown as JourneyOutcome;

vi.mock(import("./utils/errors.js"));
const mockErrorManager = vi.mocked(await import("./utils/errors.js"))
  .errorManager as unknown as {
  throwError: ReturnType<typeof vi.fn>;
  handleError: ReturnType<typeof vi.fn>;
};

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

vi.mock(import("../../utils/common.js"));
const mockGetApiBaseUrlWithStage = vi.mocked(
  await import("../../utils/common.js"),
).getApiBaseUrlWithStage;
const mockGetHeader = vi.mocked(
  await import("../../utils/common.js"),
).getHeader;

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: {
    addMetric: vi.fn(),
    addDimensions: vi.fn(),
  },
  metricsAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/logger/index.js"), () => ({
  logger: {
    appendKeys: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  loggerAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

vi.mock(
  import("../../../../commons/utils/normalizeAPIGatewayProxyEventHandlerWrapper/index.js"),
  () => ({
    normalizeAPIGatewayProxyEventHandlerWrapper: (fn) => fn,
  }),
);

const { handler } = await import("./index.js");

describe("journeyoutcome handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["JWT_SIGNING_KEY_ALIAS"] = "test-alias";
    process.env["JOURNEY_OUTCOME_TABLE_NAME"] = "test-table-name";

    mockGetApiBaseUrlWithStage.mockReturnValue("https://api.example.com/v1");

    mockGetHeader.mockImplementation((headers, key) => {
      if (key === "Authorization") {
        return headers["Authorization"] ?? headers["authorization"];
      }
      return undefined;
    });

    mockErrorManager.throwError.mockImplementation(
      (errorType: string, message: string) => {
        if (errorType === "InvalidAuthorizationHeader") {
          mockMetrics.addMetric("InvalidAuthorizationHeader", "Count", 1);
        }
        throw new Error(message);
      },
    );

    mockErrorManager.handleError.mockReturnValue({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4006",
      }),
    });
  });

  it("returns 200 status with outcome object for valid Authorization header with valid access_token containing a valid outcome_id", async () => {
    const mockPayload = {
      outcome_id: "test-outcome-id",
    } as JourneyOutcomePayload;
    mockverifySignatureAndGetPayload.mockResolvedValue(mockPayload);
    mockValidateJourneyOutcomeJwtClaims.mockResolvedValue(undefined);
    mockGetKmsKey.mockResolvedValue({} as CryptoKey);
    mockGetJourneyOutcome.mockResolvedValue(mockOutcomeData);

    const mockValidEvent = {
      headers: {
        Authorization: "Bearer blah",
        Host: "api.example.com",
      },
      requestContext: {
        stage: "v1",
        domainName: "api.example.com",
      },
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(mockValidEvent, mockContext);

    expect(mockGetApiBaseUrlWithStage).toHaveBeenCalledWith(mockValidEvent);
    expect(mockValidateJourneyOutcomeJwtClaims).toHaveBeenCalledWith(
      mockPayload,
      "https://api.example.com/v1",
    );
    expect(result).toStrictEqual({
      statusCode: 200,
      body: JSON.stringify(mockOutcomeData),
    });
  });

  it("returns 400 status with error for missing Authorization header", async () => {
    const mockInvalidEvent = {
      headers: {
        foo: "bar",
        Host: "api.example.com",
      },
      requestContext: {
        stage: "v1",
        domainName: "api.example.com",
      },
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
      headers: {
        foo: "bar",
        Authorization: "blahhhhh",
        Host: "api.example.com",
      },
      requestContext: {
        stage: "v1",
        domainName: "api.example.com",
      },
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
      headers: {
        foo: "bar",
        Authorization: "Bearer ",
        Host: "api.example.com",
      },
      requestContext: {
        stage: "v1",
        domainName: "api.example.com",
      },
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

  it("returns 400 status with error for Authorization header with only Bearer prefix", async () => {
    const mockInvalidEvent = {
      headers: {
        Authorization: "Bearer",
        Host: "api.example.com",
      },
      requestContext: {
        stage: "v1",
        domainName: "api.example.com",
      },
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
