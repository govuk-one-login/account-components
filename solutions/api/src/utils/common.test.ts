import { describe, it, expect, vi, beforeEach } from "vitest";
import { getHeader, getApiBaseUrlWithStage, ErrorManager } from "./common.js";
import type { APIGatewayProxyEvent } from "aws-lambda";

// @ts-expect-error
vi.mock(import("../../../commons/utils/logger/index.js"), () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// @ts-expect-error
vi.mock(import("../../../commons/utils/metrics/index.js"), () => ({
  metrics: { addMetric: vi.fn(), addDimensions: vi.fn() },
}));

vi.mock(import("../../../commons/utils/getEnvironment/index.js"), () => ({
  getEnvironment: vi.fn().mockReturnValue("local"),
}));

const mockGetEnvironment = vi.mocked(
  await import("../../../commons/utils/getEnvironment/index.js"),
).getEnvironment;

const mockLogger = vi.mocked(
  await import("../../../commons/utils/logger/index.js"),
).logger;

const mockMetrics = vi.mocked(
  await import("../../../commons/utils/metrics/index.js"),
).metrics;

const createEvent = (
  headers: Record<string, string>,
  stage: string,
  domainName?: string,
): APIGatewayProxyEvent =>
  ({
    headers,
    requestContext: { stage, domainName },
  }) as unknown as APIGatewayProxyEvent;

describe("getHeader", () => {
  it("returns the value for an exact case match", () => {
    expect(getHeader({ Authorization: "Bearer token" }, "Authorization")).toBe(
      "Bearer token",
    );
  });

  it("returns the value for a case-insensitive match", () => {
    expect(getHeader({ authorization: "Bearer token" }, "Authorization")).toBe(
      "Bearer token",
    );
  });

  it("returns undefined when header is not present", () => {
    expect(
      getHeader({ "Content-Type": "application/json" }, "Authorization"),
    ).toBeUndefined();
  });

  it("returns undefined for empty headers", () => {
    expect(getHeader({}, "Authorization")).toBeUndefined();
  });
});

describe("getApiBaseUrlWithStage", () => {
  it("returns localhost URL when environment is local", () => {
    const event = createEvent({}, "v1");

    expect(getApiBaseUrlWithStage(event)).toBe("http://localhost:6004");
  });

  it("constructs URL from host header", () => {
    mockGetEnvironment.mockReturnValue("dev");
    const event = createEvent({ host: "api.example.com" }, "v1");

    expect(getApiBaseUrlWithStage(event)).toBe("https://api.example.com/v1");
  });

  it("falls back to domainName when no host header", () => {
    mockGetEnvironment.mockReturnValue("dev");
    const event = createEvent({}, "v1", "api.example.com");

    expect(getApiBaseUrlWithStage(event)).toBe("https://api.example.com/v1");
  });

  it("throws when host cannot be determined", () => {
    mockGetEnvironment.mockReturnValue("dev");
    const event = createEvent({}, "v1");

    expect(() => getApiBaseUrlWithStage(event)).toThrow(
      "Unable to determine host from API Gateway event",
    );
  });
});

describe("errorManager", () => {
  const errors = {
    notFound: {
      code: "E404",
      description: "not_found",
      statusCode: 404,
      metric: {
        type: "TestError",
        subType: "NotFound",
      },
    },
    badRequest: {
      code: "E400",
      description: "invalid_request",
      statusCode: 400,
      metric: {
        type: "TestError",
        subType: "BadRequest",
      },
    },
    genericError: {
      code: "E500",
      description: "internal_server_error",
      statusCode: 500,
      metric: {
        type: "TestError",
        subType: "GenericError",
      },
    },
  };

  let errorManager: ErrorManager<typeof errors>;

  beforeEach(() => {
    vi.clearAllMocks();
    errorManager = new ErrorManager(errors);
  });

  describe("throwError", () => {
    it("throws an error with the correct code", () => {
      expect(() => errorManager.throwError("notFound", "not found")).toThrow(
        "not found",
      );
    });

    it("logs the error", () => {
      expect(() => errorManager.throwError("notFound", "not found")).toThrow(
        "not found",
      );
      expect(mockLogger.error).toHaveBeenCalledWith("Error", {
        cause: expect.objectContaining({ message: "not found" }) as Error,
      });
    });
  });

  describe("isAppError", () => {
    it("returns true for a known app error code", () => {
      const error = new Error("test") as Error & { code: string };
      error.code = "notFound";

      expect(errorManager.isAppError(error)).toBe(true);
    });

    it("returns false for an unknown error code", () => {
      const error = new Error("test") as Error & { code: string };
      error.code = "unknownError";

      expect(errorManager.isAppError(error)).toBe(false);
    });

    it("returns false for a plain Error with no code", () => {
      expect(errorManager.isAppError(new Error("test"))).toBe(false);
    });
  });

  describe("handleError", () => {
    it("returns the correct response for a known app error", () => {
      const error = new Error("test") as Error & { code: string };
      error.code = "notFound";

      expect(errorManager.handleError(error)).toStrictEqual({
        statusCode: 404,
        body: JSON.stringify({ error: "not_found", error_description: "E404" }),
      });
    });

    it("falls back to genericError for unknown errors", () => {
      expect(errorManager.handleError(new Error("unknown"))).toStrictEqual({
        statusCode: 500,
        body: JSON.stringify({
          error: "internal_server_error",
          error_description: "E500",
        }),
      });
    });

    it("adds a metric when the error type has a metric defined", () => {
      const error = new Error("test") as Error & { code: string };
      error.code = "badRequest";
      errorManager.handleError(error);

      expect(mockMetrics.addDimensions).toHaveBeenCalledWith({
        error_type: "BadRequest",
      });
      expect(mockMetrics.addMetric).toHaveBeenCalledWith(
        "TestError",
        "Count",
        1,
      );
    });

    it("adds the correct metric dimensions for a known error", () => {
      const error = new Error("test") as Error & { code: string };
      error.code = "notFound";
      errorManager.handleError(error);

      expect(mockMetrics.addDimensions).toHaveBeenCalledWith({
        error_type: "NotFound",
      });
      expect(mockMetrics.addMetric).toHaveBeenCalledWith(
        "TestError",
        "Count",
        1,
      );
    });

    it("logs a warning with the error details", () => {
      const error = new Error("test") as Error & { code: string };
      error.code = "notFound";
      errorManager.handleError(error);

      expect(mockLogger.warn).toHaveBeenCalledWith("Invalid Request", {
        error: errors.notFound,
      });
    });
  });
});
