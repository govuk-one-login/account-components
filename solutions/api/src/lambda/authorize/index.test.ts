import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";

process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";

const getQueryParams = vi.fn();
const getClient = vi.fn();
const decryptJar = vi.fn();
const verifyJwt = vi.fn();
const mockLogger = {
  error: vi.fn(),
};
const mockMetrics = {
  addMetric: vi.fn(),
};

vi.mock(import("./utils/getQueryParams.js"), () => ({
  getQueryParams,
}));

vi.mock(import("./utils/getClient.js"), () => ({
  getClient,
}));

vi.mock(import("./utils/decryptJar.js"), () => ({
  decryptJar,
}));

vi.mock(import("./utils/verifyJwt.js"), () => ({
  verifyJwt,
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/logger/index.js"), () => ({
  logger: mockLogger,
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: mockMetrics,
}));

const { handler } = await import("./index.js");
const { ErrorResponse, badRequestResponse } = await import("./utils/common.js");

describe("authorize handler", () => {
  const mockEvent = {} as APIGatewayProxyEvent;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when getQueryParams fails", async () => {
    const errorResponse = new ErrorResponse({
      statusCode: 302,
      headers: { location: "https://example.com/error" },
      body: "",
    });
    getQueryParams.mockReturnValue(errorResponse);

    const result = await handler(mockEvent);

    expect(result).toBe(errorResponse.errorResponse);
  });

  it("returns error when getClient fails", async () => {
    const queryParams = {
      client_id: "test-client",
      redirect_uri: "http://test.com",
    };
    const errorResponse = new ErrorResponse({
      statusCode: 302,
      headers: { location: "https://example.com/error" },
      body: "",
    });

    getQueryParams.mockReturnValue(queryParams);
    getClient.mockResolvedValue(errorResponse);

    const result = await handler(mockEvent);

    expect(result).toBe(errorResponse.errorResponse);
    expect(getClient).toHaveBeenCalledWith("test-client", "http://test.com");
  });

  it("returns error when decryptJar fails", async () => {
    const queryParams = {
      client_id: "test-client",
      redirect_uri: "http://test.com",
      request: "encrypted-jar",
      state: "test-state",
    };
    const client = { id: "test-client" };
    const errorResponse = new ErrorResponse({
      statusCode: 302,
      headers: { location: "https://example.com/error" },
      body: "",
    });

    getQueryParams.mockReturnValue(queryParams);
    getClient.mockResolvedValue(client);
    decryptJar.mockResolvedValue(errorResponse);

    const result = await handler(mockEvent);

    expect(result).toBe(errorResponse.errorResponse);
    expect(decryptJar).toHaveBeenCalledWith(
      "encrypted-jar",
      "test-client",
      "http://test.com",
      "test-state",
    );
  });

  it("returns error when verifyJwt fails", async () => {
    const queryParams = {
      client_id: "test-client",
      redirect_uri: "http://test.com",
      request: "encrypted-jar",
      state: "test-state",
    };
    const client = { id: "test-client" };
    const signedJwt = "signed-jwt-string";
    const errorResponse = new ErrorResponse({
      statusCode: 302,
      headers: { location: "https://example.com/error" },
      body: "",
    });

    getQueryParams.mockReturnValue(queryParams);
    getClient.mockResolvedValue(client);
    decryptJar.mockResolvedValue(signedJwt);
    verifyJwt.mockResolvedValue(errorResponse);

    const result = await handler(mockEvent);

    expect(result).toBe(errorResponse.errorResponse);
    expect(verifyJwt).toHaveBeenCalledWith(
      signedJwt,
      client,
      "http://test.com",
      "test-state",
    );
  });

  it("returns success when all functions succeed", async () => {
    const queryParams = {
      client_id: "test-client",
      redirect_uri: "http://test.com",
      request: "encrypted-jar",
      state: "test-state",
    };
    const client = { id: "test-client" };
    const signedJwt = "signed-jwt-string";
    const claims = { sub: "user123" };

    getQueryParams.mockReturnValue(queryParams);
    getClient.mockResolvedValue(client);
    decryptJar.mockResolvedValue(signedJwt);
    verifyJwt.mockResolvedValue(claims);

    const result = await handler(mockEvent);

    expect(result).toStrictEqual({
      statusCode: 200,
      body: JSON.stringify(
        {
          message: "Authorized",
          claims,
        },
        null,
        2,
      ),
    });
    expect(verifyJwt).toHaveBeenCalledWith(
      signedJwt,
      client,
      "http://test.com",
      "test-state",
    );
  });

  it("handles unexpected errors in try-catch block", async () => {
    const error = new Error("Unexpected error");
    getQueryParams.mockImplementation(() => {
      throw error;
    });

    const result = await handler(mockEvent);

    expect(result).toStrictEqual(badRequestResponse);
    expect(mockLogger.error).toHaveBeenCalledWith("Authorize error", {
      error,
    });
    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "InvalidAuthorizeRequest",
      "Count",
      1,
    );
  });
});
