import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockDelete = vi.fn();
const mockGetDynamoDbClient = vi.fn();
const mockMetrics = {
  addMetric: vi.fn(),
};
const mockGetApiSessionCookieOptions = vi.fn();

vi.mock(
  import("../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: mockGetDynamoDbClient,
  }),
);

// @ts-expect-error
vi.mock(import("../../../commons/utils/observability/index.js"), () => ({
  metrics: mockMetrics,
}));

// @ts-expect-error
vi.mock(import("../../../commons/utils/apiSessionCookie/index.js"), () => ({
  apiSessionCookieName: "apisession",
  getApiSessionCookieOptions: mockGetApiSessionCookieOptions,
}));

describe("destroyApiSession", () => {
  const originalEnv = process.env;
  const mockClearCookie = vi.fn();
  const mockLog = {
    error: vi.fn(),
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env["API_SESSIONS_TABLE_NAME"] = "test-sessions-table";
    process.env["API_SESSION_COOKIE_DOMAIN"] = "example.com";

    mockGetDynamoDbClient.mockReturnValue({
      delete: mockDelete,
    });

    mockGetApiSessionCookieOptions.mockReturnValue({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      domain: "example.com",
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("deletes session from DynamoDB and clears cookie when session exists", async () => {
    const { destroyApiSession } = await import("./apiSession.js");

    const mockRequest = {
      cookies: { apisession: "session-id-123" },
      log: mockLog,
    } as unknown as FastifyRequest;

    const mockReply = {
      clearCookie: mockClearCookie,
    } as unknown as FastifyReply;

    mockDelete.mockResolvedValue({});

    await destroyApiSession(mockRequest, mockReply);

    expect(mockDelete).toHaveBeenCalledWith({
      TableName: "test-sessions-table",
      Key: {
        id: "session-id-123",
      },
    });

    expect(mockClearCookie).toHaveBeenCalledWith("apisession", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      domain: "example.com",
    });
  });

  it("only clears cookie when no session cookie exists", async () => {
    const { destroyApiSession } = await import("./apiSession.js");

    const mockRequest = {
      cookies: {},
      log: mockLog,
    } as unknown as FastifyRequest;

    const mockReply = {
      clearCookie: mockClearCookie,
    } as unknown as FastifyReply;

    await destroyApiSession(mockRequest, mockReply);

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockClearCookie).toHaveBeenCalledWith("apisession", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      domain: "example.com",
    });
  });

  it("logs error and adds metric when DynamoDB delete fails", async () => {
    const { destroyApiSession } = await import("./apiSession.js");

    const mockRequest = {
      cookies: { apisession: "session-id-123" },
      log: mockLog,
    } as unknown as FastifyRequest;

    const mockReply = {
      clearCookie: mockClearCookie,
    } as unknown as FastifyReply;

    const deleteError = new Error("DynamoDB delete failed");
    mockDelete.mockRejectedValue(deleteError);

    await destroyApiSession(mockRequest, mockReply);

    expect(mockLog.error).toHaveBeenCalledWith(
      deleteError,
      "ApiSessionDeleteError",
    );
    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "ApiSessionDeleteError",
      "Count",
      1,
    );
    expect(mockClearCookie).toHaveBeenCalledWith("apisession", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      domain: "example.com",
    });
  });

  it("throws error when API_SESSION_COOKIE_DOMAIN is not set", async () => {
    delete process.env["API_SESSION_COOKIE_DOMAIN"];

    const { destroyApiSession } = await import("./apiSession.js");

    const mockRequest = {
      cookies: {},
      log: mockLog,
    } as unknown as FastifyRequest;

    const mockReply = {
      clearCookie: mockClearCookie,
    } as unknown as FastifyReply;

    await expect(
      destroyApiSession(mockRequest, mockReply),
    ).rejects.toThrowError("API_SESSION_COOKIE_DOMAIN is not set");
  });
});
