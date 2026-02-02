import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startSessionAndGoToJourney } from "./startSessionAndGoToJourney.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Scope } from "../../../../../commons/utils/interfaces.js";
import * as jose from "jose";
import type { Claims } from "../../../utils/getClaimsSchema.js";

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/logger/index.js"), () => ({
  logger: { warn: vi.fn() },
}));

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/metrics/index.js"), () => ({
  metrics: { addMetric: vi.fn() },
}));

vi.mock(import("jose"), () => ({
  decodeJwt: vi.fn(),
}));

describe("startSessionAndGoToJourney", () => {
  const mockDecodeJwt = vi.mocked(jose.decodeJwt);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("redirects to testing journey path with default session expiry", async () => {
    const mockRegenerate = vi.fn().mockResolvedValue(undefined);
    const mockRedirect = vi.fn().mockReturnThis();
    const mockSession = { regenerate: mockRegenerate };

    const request = { session: mockSession } as unknown as FastifyRequest;
    const reply = { redirect: mockRedirect } as unknown as FastifyReply;

    const claims = {
      sub: "user-123",
      scope: Scope.testingJourney,
    } as Claims;

    await startSessionAndGoToJourney(
      reply,
      request,
      claims,
      "client-id",
      "https://example.com/callback",
    );

    expect(mockRegenerate).toHaveBeenCalledTimes(1);
    expect(request.session.claims).toBe(claims);
    expect(request.session.user_id).toBe("user-123");
    expect(request.session.expires).toBe(1704110400 + 1800);
    expect(mockRedirect).toHaveBeenCalledWith("/testing-journey/step-1");
  });

  it("redirects to account delete journey path", async () => {
    const mockRegenerate = vi.fn().mockResolvedValue(undefined);
    const mockRedirect = vi.fn().mockReturnThis();
    const mockSession = { regenerate: mockRegenerate };

    const request = { session: mockSession } as unknown as FastifyRequest;
    const reply = { redirect: mockRedirect } as unknown as FastifyReply;

    const claims = {
      sub: "user-456",
      scope: Scope.accountDelete,
    } as Claims;

    await startSessionAndGoToJourney(
      reply,
      request,
      claims,
      "client-id",
      "https://example.com/callback",
    );

    expect(mockRedirect).toHaveBeenCalledWith("/delete-account/introduction");
  });

  it("sets session expiry based on account management API token expiry", async () => {
    const mockRegenerate = vi.fn().mockResolvedValue(undefined);
    const mockRedirect = vi.fn().mockReturnThis();
    const mockSession = { regenerate: mockRegenerate };

    const request = { session: mockSession } as unknown as FastifyRequest;
    const reply = { redirect: mockRedirect } as unknown as FastifyReply;

    const tokenExpiry = 1704114000;
    mockDecodeJwt.mockReturnValue({ exp: tokenExpiry });

    const claims = {
      sub: "user-789",
      scope: Scope.testingJourney,
      account_management_api_access_token: "token-123",
    } as Claims;

    await startSessionAndGoToJourney(
      reply,
      request,
      claims,
      "client-id",
      "https://example.com/callback",
    );

    expect(mockDecodeJwt).toHaveBeenCalledWith("token-123");
    expect(request.session.expires).toBe(tokenExpiry);
  });

  it("sets session expiry based on account data API token expiry", async () => {
    const mockRegenerate = vi.fn().mockResolvedValue(undefined);
    const mockRedirect = vi.fn().mockReturnThis();
    const mockSession = { regenerate: mockRegenerate };

    const request = { session: mockSession } as unknown as FastifyRequest;
    const reply = { redirect: mockRedirect } as unknown as FastifyReply;

    const tokenExpiry = 1704111600;
    mockDecodeJwt.mockReturnValue({ exp: tokenExpiry });

    const claims = {
      sub: "user-abc",
      scope: Scope.testingJourney,
      account_data_api_access_token: "token-456",
    } as Claims;

    await startSessionAndGoToJourney(
      reply,
      request,
      claims,
      "client-id",
      "https://example.com/callback",
    );

    expect(mockDecodeJwt).toHaveBeenCalledWith("token-456");
    expect(request.session.expires).toBe(tokenExpiry);
  });

  it("uses minimum expiry when both tokens present", async () => {
    const mockRegenerate = vi.fn().mockResolvedValue(undefined);
    const mockRedirect = vi.fn().mockReturnThis();
    const mockSession = { regenerate: mockRegenerate };

    const request = { session: mockSession } as unknown as FastifyRequest;
    const reply = { redirect: mockRedirect } as unknown as FastifyReply;

    const earlierExpiry = 1704111400;
    const laterExpiry = 1704115400;

    mockDecodeJwt
      .mockReturnValueOnce({ exp: laterExpiry })
      .mockReturnValueOnce({ exp: earlierExpiry });

    const claims = {
      sub: "user-def",
      scope: Scope.testingJourney,
      account_management_api_access_token: "token-1",
      account_data_api_access_token: "token-2",
    } as Claims;

    await startSessionAndGoToJourney(
      reply,
      request,
      claims,
      "client-id",
      "https://example.com/callback",
    );

    expect(request.session.expires).toBe(earlierExpiry);
  });

  it("caps session expiry at 2 hours", async () => {
    const mockRegenerate = vi.fn().mockResolvedValue(undefined);
    const mockRedirect = vi.fn().mockReturnThis();
    const mockSession = { regenerate: mockRegenerate };

    const request = { session: mockSession } as unknown as FastifyRequest;
    const reply = { redirect: mockRedirect } as unknown as FastifyReply;

    const farFutureExpiry = 1704120400;
    mockDecodeJwt.mockReturnValue({ exp: farFutureExpiry });

    const claims = {
      sub: "user-ghi",
      scope: Scope.testingJourney,
      account_management_api_access_token: "token-789",
    } as Claims;

    await startSessionAndGoToJourney(
      reply,
      request,
      claims,
      "client-id",
      "https://example.com/callback",
    );

    expect(request.session.expires).toBe(1704117600);
  });

  it("returns error response when session regeneration fails", async () => {
    const mockRegenerate = vi
      .fn()
      .mockRejectedValue(new Error("Session error"));
    const mockRedirect = vi.fn().mockReturnThis();
    const mockSession = { regenerate: mockRegenerate };

    const request = { session: mockSession } as unknown as FastifyRequest;
    const reply = { redirect: mockRedirect } as unknown as FastifyReply;

    const claims = {
      sub: "user-jkl",
      scope: Scope.testingJourney,
    } as Claims;

    const result = await startSessionAndGoToJourney(
      reply,
      request,
      claims,
      "client-id",
      "https://example.com/callback",
      "state-123",
    );

    expect(result).toHaveProperty("reply");
    expect(mockRedirect).toHaveBeenCalledWith(
      "https://example.com/callback?error=server_error&error_description=E3004&state=state-123",
    );
  });

  it("includes state parameter in error redirect when provided", async () => {
    const mockRegenerate = vi.fn().mockRejectedValue(new Error("Failure"));
    const mockRedirect = vi.fn().mockReturnThis();
    const mockSession = { regenerate: mockRegenerate };

    const request = { session: mockSession } as unknown as FastifyRequest;
    const reply = { redirect: mockRedirect } as unknown as FastifyReply;

    const claims = {
      sub: "user-mno",
      scope: Scope.accountDelete,
    } as Claims;

    await startSessionAndGoToJourney(
      reply,
      request,
      claims,
      "client-id",
      "https://example.com/callback",
      "state-456",
    );

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("state=state-456"),
    );
  });
});
