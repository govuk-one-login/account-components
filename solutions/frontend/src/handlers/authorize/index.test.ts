import { describe, it, expect, vi, beforeEach } from "vitest";
import { getHandler } from "./index.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ErrorResponse } from "./utils/common.js";

vi.mock(import("./utils/getQueryParams.js"), () => ({
  getQueryParams: vi.fn(),
}));

vi.mock(import("./utils/checkSameUserAgent.js"), () => ({
  checkSameUserAgent: vi.fn(),
}));

vi.mock(import("./utils/getClient.js"), () => ({
  getClient: vi.fn(),
}));

vi.mock(import("./utils/decryptJar.js"), () => ({
  decryptJar: vi.fn(),
}));

vi.mock(import("./utils/verifyJwt.js"), () => ({
  verifyJwt: vi.fn(),
}));

vi.mock(import("./utils/checkJtiUnused.js"), () => ({
  checkJtiUnused: vi.fn(),
}));

vi.mock(import("./utils/startSessionAndGoToJourney.js"), () => ({
  startSessionAndGoToJourney: vi.fn(),
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: { addDimensions: vi.fn(), addMetric: vi.fn() },
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/logger/index.js"), () => ({
  logger: { appendKeys: vi.fn(), error: vi.fn() },
}));

describe("getHandler", () => {
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRequest = { query: {} } as FastifyRequest;
    mockReply = { redirect: vi.fn() } as unknown as FastifyReply;
  });

  it("returns error when getQueryParams fails", async () => {
    const { getQueryParams } = await import("./utils/getQueryParams.js");
    vi.mocked(getQueryParams).mockReturnValue(new ErrorResponse(mockReply));

    const result = await getHandler(mockRequest, mockReply);

    expect(getQueryParams).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockReply);
  });

  it("returns error when checkSameUserAgent fails", async () => {
    const { getQueryParams } = await import("./utils/getQueryParams.js");
    const { checkSameUserAgent } =
      await import("./utils/checkSameUserAgent.js");

    const queryParams = {
      request: "test-request",
      response_type: "code",
      scope: "test-scope",
      client_id: "test-client",
      redirect_uri: "https://example.com/callback",
    };

    vi.mocked(getQueryParams).mockReturnValue(
      queryParams as ReturnType<typeof getQueryParams>,
    );
    vi.mocked(checkSameUserAgent).mockResolvedValue(
      new ErrorResponse(mockReply),
    );

    const result = await getHandler(mockRequest, mockReply);

    expect(getQueryParams).toHaveBeenCalledTimes(1);
    expect(checkSameUserAgent).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockReply);
  });

  it("returns error when getClient fails", async () => {
    const { getQueryParams } = await import("./utils/getQueryParams.js");
    const { checkSameUserAgent } =
      await import("./utils/checkSameUserAgent.js");
    const { getClient } = await import("./utils/getClient.js");

    const queryParams = {
      request: "test-request",
      response_type: "code",
      scope: "test-scope",
      client_id: "test-client",
      redirect_uri: "https://example.com/callback",
    };

    vi.mocked(getQueryParams).mockReturnValue(
      queryParams as ReturnType<typeof getQueryParams>,
    );
    vi.mocked(checkSameUserAgent).mockResolvedValue(true);
    vi.mocked(getClient).mockResolvedValue(new ErrorResponse(mockReply));

    const result = await getHandler(mockRequest, mockReply);

    expect(getQueryParams).toHaveBeenCalledTimes(1);
    expect(checkSameUserAgent).toHaveBeenCalledTimes(1);
    expect(getClient).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockReply);
  });

  it("returns error when decryptJar fails", async () => {
    const { getQueryParams } = await import("./utils/getQueryParams.js");
    const { checkSameUserAgent } =
      await import("./utils/checkSameUserAgent.js");
    const { getClient } = await import("./utils/getClient.js");
    const { decryptJar } = await import("./utils/decryptJar.js");

    const queryParams = {
      request: "test-request",
      response_type: "code",
      scope: "test-scope",
      client_id: "test-client",
      redirect_uri: "https://example.com/callback",
    };

    const mockClient = {
      client_id: "test-client",
      scope: "test-scope",
      redirect_uris: ["https://example.com/callback"],
      client_name: "Test Client",
      jwks_uri: "https://example.com/jwks",
      consider_user_logged_in: false,
    };

    vi.mocked(getQueryParams).mockReturnValue(
      queryParams as ReturnType<typeof getQueryParams>,
    );
    vi.mocked(checkSameUserAgent).mockResolvedValue(true);
    vi.mocked(getClient).mockResolvedValue(mockClient);
    vi.mocked(decryptJar).mockResolvedValue(new ErrorResponse(mockReply));

    const result = await getHandler(mockRequest, mockReply);

    expect(getQueryParams).toHaveBeenCalledTimes(1);
    expect(checkSameUserAgent).toHaveBeenCalledTimes(1);
    expect(getClient).toHaveBeenCalledTimes(1);
    expect(decryptJar).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockReply);
  });

  it("returns error when verifyJwt fails", async () => {
    const { getQueryParams } = await import("./utils/getQueryParams.js");
    const { checkSameUserAgent } =
      await import("./utils/checkSameUserAgent.js");
    const { getClient } = await import("./utils/getClient.js");
    const { decryptJar } = await import("./utils/decryptJar.js");
    const { verifyJwt } = await import("./utils/verifyJwt.js");

    const queryParams = {
      request: "test-request",
      response_type: "code",
      scope: "test-scope",
      client_id: "test-client",
      redirect_uri: "https://example.com/callback",
    };

    const mockClient = {
      client_id: "test-client",
      scope: "test-scope",
      redirect_uris: ["https://example.com/callback"],
      client_name: "Test Client",
      jwks_uri: "https://example.com/jwks",
      consider_user_logged_in: false,
    };

    vi.mocked(getQueryParams).mockReturnValue(
      queryParams as ReturnType<typeof getQueryParams>,
    );
    vi.mocked(checkSameUserAgent).mockResolvedValue(true);
    vi.mocked(getClient).mockResolvedValue(mockClient);
    vi.mocked(decryptJar).mockResolvedValue("signed-jwt");
    vi.mocked(verifyJwt).mockResolvedValue(new ErrorResponse(mockReply));

    const result = await getHandler(mockRequest, mockReply);

    expect(getQueryParams).toHaveBeenCalledTimes(1);
    expect(checkSameUserAgent).toHaveBeenCalledTimes(1);
    expect(getClient).toHaveBeenCalledTimes(1);
    expect(decryptJar).toHaveBeenCalledTimes(1);
    expect(verifyJwt).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockReply);
  });

  it("returns error when checkJtiUnused fails", async () => {
    const { getQueryParams } = await import("./utils/getQueryParams.js");
    const { checkSameUserAgent } =
      await import("./utils/checkSameUserAgent.js");
    const { getClient } = await import("./utils/getClient.js");
    const { decryptJar } = await import("./utils/decryptJar.js");
    const { verifyJwt } = await import("./utils/verifyJwt.js");
    const { checkJtiUnused } = await import("./utils/checkJtiUnused.js");

    const queryParams = {
      request: "test-request",
      response_type: "code",
      scope: "test-scope",
      client_id: "test-client",
      redirect_uri: "https://example.com/callback",
    };

    const mockClient = {
      client_id: "test-client",
      scope: "test-scope",
      redirect_uris: ["https://example.com/callback"],
      client_name: "Test Client",
      jwks_uri: "https://example.com/jwks",
      consider_user_logged_in: false,
    };

    const mockClaims = {
      sub: "user-123",
      scope: "test-scope",
      jti: "jti-123",
    };

    vi.mocked(getQueryParams).mockReturnValue(
      queryParams as ReturnType<typeof getQueryParams>,
    );
    vi.mocked(checkSameUserAgent).mockResolvedValue(true);
    vi.mocked(getClient).mockResolvedValue(mockClient);
    vi.mocked(decryptJar).mockResolvedValue("signed-jwt");
    vi.mocked(verifyJwt).mockResolvedValue(
      mockClaims as Awaited<ReturnType<typeof verifyJwt>>,
    );
    vi.mocked(checkJtiUnused).mockResolvedValue(new ErrorResponse(mockReply));

    const result = await getHandler(mockRequest, mockReply);

    expect(getQueryParams).toHaveBeenCalledTimes(1);
    expect(checkSameUserAgent).toHaveBeenCalledTimes(1);
    expect(getClient).toHaveBeenCalledTimes(1);
    expect(decryptJar).toHaveBeenCalledTimes(1);
    expect(verifyJwt).toHaveBeenCalledTimes(1);
    expect(checkJtiUnused).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockReply);
  });

  it("returns error when startSessionAndGoToJourney fails", async () => {
    const { getQueryParams } = await import("./utils/getQueryParams.js");
    const { checkSameUserAgent } =
      await import("./utils/checkSameUserAgent.js");
    const { getClient } = await import("./utils/getClient.js");
    const { decryptJar } = await import("./utils/decryptJar.js");
    const { verifyJwt } = await import("./utils/verifyJwt.js");
    const { checkJtiUnused } = await import("./utils/checkJtiUnused.js");
    const { startSessionAndGoToJourney } =
      await import("./utils/startSessionAndGoToJourney.js");

    const queryParams = {
      request: "test-request",
      response_type: "code",
      scope: "test-scope",
      client_id: "test-client",
      redirect_uri: "https://example.com/callback",
    };

    const mockClient = {
      client_id: "test-client",
      scope: "test-scope",
      redirect_uris: ["https://example.com/callback"],
      client_name: "Test Client",
      jwks_uri: "https://example.com/jwks",
      consider_user_logged_in: false,
    };

    const mockClaims = {
      sub: "user-123",
      scope: "test-scope",
      jti: "jti-123",
    };

    vi.mocked(getQueryParams).mockReturnValue(
      queryParams as ReturnType<typeof getQueryParams>,
    );
    vi.mocked(checkSameUserAgent).mockResolvedValue(true);
    vi.mocked(getClient).mockResolvedValue(mockClient);
    vi.mocked(decryptJar).mockResolvedValue("signed-jwt");
    vi.mocked(verifyJwt).mockResolvedValue(
      mockClaims as Awaited<ReturnType<typeof verifyJwt>>,
    );
    vi.mocked(checkJtiUnused).mockResolvedValue(undefined);
    vi.mocked(startSessionAndGoToJourney).mockResolvedValue(
      new ErrorResponse(mockReply),
    );

    const result = await getHandler(mockRequest, mockReply);

    expect(getQueryParams).toHaveBeenCalledTimes(1);
    expect(checkSameUserAgent).toHaveBeenCalledTimes(1);
    expect(getClient).toHaveBeenCalledTimes(1);
    expect(decryptJar).toHaveBeenCalledTimes(1);
    expect(verifyJwt).toHaveBeenCalledTimes(1);
    expect(checkJtiUnused).toHaveBeenCalledTimes(1);
    expect(startSessionAndGoToJourney).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockReply);
  });

  it("successfully completes authorization flow", async () => {
    const { getQueryParams } = await import("./utils/getQueryParams.js");
    const { checkSameUserAgent } =
      await import("./utils/checkSameUserAgent.js");
    const { getClient } = await import("./utils/getClient.js");
    const { decryptJar } = await import("./utils/decryptJar.js");
    const { verifyJwt } = await import("./utils/verifyJwt.js");
    const { checkJtiUnused } = await import("./utils/checkJtiUnused.js");
    const { startSessionAndGoToJourney } =
      await import("./utils/startSessionAndGoToJourney.js");
    const { metrics } =
      await import("../../../../commons/utils/metrics/index.js");
    const { logger } =
      await import("../../../../commons/utils/logger/index.js");

    const queryParams = {
      request: "test-request",
      response_type: "code",
      scope: "test-scope",
      client_id: "test-client",
      redirect_uri: "https://example.com/callback",
    };

    const mockClient = {
      client_id: "test-client",
      scope: "test-scope",
      redirect_uris: ["https://example.com/callback"],
      client_name: "Test Client",
      jwks_uri: "https://example.com/jwks",
      consider_user_logged_in: false,
    };

    const mockClaims = {
      sub: "user-123",
      scope: "test-scope",
      jti: "jti-123",
    };

    vi.mocked(getQueryParams).mockReturnValue(
      queryParams as ReturnType<typeof getQueryParams>,
    );
    vi.mocked(checkSameUserAgent).mockResolvedValue(true);
    vi.mocked(getClient).mockResolvedValue(mockClient);
    vi.mocked(decryptJar).mockResolvedValue("signed-jwt");
    vi.mocked(verifyJwt).mockResolvedValue(
      mockClaims as Awaited<ReturnType<typeof verifyJwt>>,
    );
    vi.mocked(checkJtiUnused).mockResolvedValue(undefined);
    // @ts-expect-error
    vi.mocked(startSessionAndGoToJourney).mockResolvedValue(mockReply);

    const result = await getHandler(mockRequest, mockReply);

    expect(getQueryParams).toHaveBeenCalledTimes(1);
    expect(checkSameUserAgent).toHaveBeenCalledTimes(1);
    expect(getClient).toHaveBeenCalledTimes(1);
    expect(decryptJar).toHaveBeenCalledTimes(1);
    expect(verifyJwt).toHaveBeenCalledTimes(1);
    expect(checkJtiUnused).toHaveBeenCalledTimes(1);
    expect(startSessionAndGoToJourney).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metrics.addDimensions).toHaveBeenCalledWith({
      client_id: "test-client",
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metrics.addDimensions).toHaveBeenCalledWith({
      scope: "test-scope",
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.appendKeys).toHaveBeenCalledWith({
      client_id: "test-client",
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.appendKeys).toHaveBeenCalledWith({
      scope: "test-scope",
    });
    expect(result).toBe(mockReply);
  });

  it("handles unexpected errors", async () => {
    const { getQueryParams } = await import("./utils/getQueryParams.js");
    const { logger } =
      await import("../../../../commons/utils/logger/index.js");
    const { metrics } =
      await import("../../../../commons/utils/metrics/index.js");

    vi.mocked(getQueryParams).mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    await getHandler(mockRequest, mockReply);

    expect(getQueryParams).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith("Authorize error", {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      error: expect.any(Error),
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metrics.addMetric).toHaveBeenCalledWith(
      "InvalidAuthorizeRequest",
      expect.anything(),
      1,
    );
  });
});
