import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";

process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";

const getQueryParams = vi.fn();
const getClient = vi.fn();
const decryptJar = vi.fn();
const verifyJwt = vi.fn();
const checkJtiUnusedAndSetUpSession = vi.fn();
const mockLogger = {
  error: vi.fn(),
  appendKeys: vi.fn(),
};
const mockMetrics = {
  addMetric: vi.fn(),
  addDimensions: vi.fn(),
};
const mockContext = {} as unknown as Context;

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

vi.mock(import("./utils/checkJtiUnusedAndSetUpSession.js"), () => ({
  checkJtiUnusedAndSetUpSession,
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/logger/index.js"), () => ({
  logger: mockLogger,
  loggerAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: mockMetrics,
  metricsAPIGatewayProxyHandlerWrapper: (fn) => fn,
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

    const result = await handler(mockEvent, mockContext);

    expect(result).toBe(errorResponse.errorResponse);
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({ client_id: "" });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({ client_id: "" });
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

    const result = await handler(mockEvent, mockContext);

    expect(result).toBe(errorResponse.errorResponse);
    expect(getClient).toHaveBeenCalledWith("test-client", "http://test.com");
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({ client_id: "" });
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({
      client_id: "test-client",
    });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({ client_id: "" });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({
      client_id: "test-client",
    });
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

    const result = await handler(mockEvent, mockContext);

    expect(result).toBe(errorResponse.errorResponse);
    expect(decryptJar).toHaveBeenCalledWith(
      "encrypted-jar",
      "test-client",
      "http://test.com",
      "test-state",
    );
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({ client_id: "" });
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({
      client_id: "test-client",
    });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({ client_id: "" });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({
      client_id: "test-client",
    });
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

    const result = await handler(mockEvent, mockContext);

    expect(result).toBe(errorResponse.errorResponse);
    expect(verifyJwt).toHaveBeenCalledWith(
      signedJwt,
      client,
      "http://test.com",
      "test-state",
    );
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({ client_id: "" });
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({
      client_id: "test-client",
    });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({ client_id: "" });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({
      client_id: "test-client",
    });
  });

  it("returns error when checkJtiUnusedAndSetUpSession fails", async () => {
    const queryParams = {
      client_id: "test-client",
      redirect_uri: "http://test.com",
      request: "encrypted-jar",
      state: "test-state",
    };
    const client = { client_id: "test-client" };
    const signedJwt = "signed-jwt-string";
    const claims = { jti: "jwt-id-123", scope: "test-scope" };
    const errorResponse = new ErrorResponse({
      statusCode: 302,
      headers: { location: "https://example.com/error" },
      body: "",
    });

    getQueryParams.mockReturnValue(queryParams);
    getClient.mockResolvedValue(client);
    decryptJar.mockResolvedValue(signedJwt);
    verifyJwt.mockResolvedValue(claims);
    checkJtiUnusedAndSetUpSession.mockResolvedValue(errorResponse);

    const result = await handler(mockEvent, mockContext);

    expect(result).toBe(errorResponse.errorResponse);
    expect(checkJtiUnusedAndSetUpSession).toHaveBeenCalledWith(
      claims,
      "test-client",
      "http://test.com",
      "test-state",
    );
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({ client_id: "" });
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({
      client_id: "test-client",
    });
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({
      scope: "test-scope",
    });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({ client_id: "" });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({
      client_id: "test-client",
    });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({
      scope: "test-scope",
    });
  });

  it("returns success when all functions succeed", async () => {
    const queryParams = {
      client_id: "test-client",
      redirect_uri: "http://test.com",
      request: "encrypted-jar",
      state: "test-state",
    };
    const client = { client_id: "test-client" };
    const signedJwt = "signed-jwt-string";
    const claims = { jti: "jwt-id-123", sub: "user123", scope: "test-scope" };
    const successResponse = {
      statusCode: 302,
      headers: {
        location: "https://frontend.example.com/start-session",
      },
      multiValueHeaders: {
        "Set-Cookie": ["session-id=abc123; Secure; HttpOnly; SameSite=Strict"],
      },
      body: "",
    };

    getQueryParams.mockReturnValue(queryParams);
    getClient.mockResolvedValue(client);
    decryptJar.mockResolvedValue(signedJwt);
    verifyJwt.mockResolvedValue(claims);
    checkJtiUnusedAndSetUpSession.mockResolvedValue(successResponse);

    const result = await handler(mockEvent, mockContext);

    expect(result).toBe(successResponse);
    expect(checkJtiUnusedAndSetUpSession).toHaveBeenCalledWith(
      claims,
      "test-client",
      "http://test.com",
      "test-state",
    );
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({ client_id: "" });
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({
      client_id: "test-client",
    });
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({
      scope: "test-scope",
    });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({ client_id: "" });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({
      client_id: "test-client",
    });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({
      scope: "test-scope",
    });
  });

  it("handles unexpected errors in try-catch block", async () => {
    const error = new Error("Unexpected error");
    getQueryParams.mockImplementation(() => {
      throw error;
    });

    const result = await handler(mockEvent, mockContext);

    expect(result).toStrictEqual(badRequestResponse);
    expect(mockLogger.error).toHaveBeenCalledWith("Authorize error", {
      error,
    });
    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "InvalidAuthorizeRequest",
      "Count",
      1,
    );
    expect(mockMetrics.addDimensions).toHaveBeenCalledWith({ client_id: "" });
    expect(mockLogger.appendKeys).toHaveBeenCalledWith({ client_id: "" });
  });
});
