import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkSameUserAgent } from "./checkSameUserAgent.js";
import { ErrorResponse } from "./common.js";
import type { FastifyReply, FastifyRequest } from "fastify";

// @ts-expect-error
vi.mock(import("node:crypto"), () => ({
  createHash: vi.fn(() => ({
    update: vi.fn(() => ({
      digest: vi.fn(),
    })),
  })),
}));

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

describe("checkSameUserAgent", () => {
  const clientId = "test-client";
  const requestJws = "test-jws-token";
  const redirectUri = "https://example.com/callback";
  const state = "test-state";
  const validHash = "valid-hash";

  let request: FastifyRequest;
  let reply: FastifyReply;

  beforeEach(async () => {
    vi.clearAllMocks();
    const crypto = await import("node:crypto");
    // @ts-expect-error
    vi.mocked(crypto.createHash).mockReturnValue({
      update: vi.fn().mockReturnValue({
        digest: vi.fn().mockReturnValue(validHash),
      }),
    });
    request = {
      cookies: {},
    } as unknown as FastifyRequest;
    reply = {
      redirect: vi.fn(),
    } as unknown as FastifyReply;
  });

  it("returns true when cookie matches hash", async () => {
    request.cookies = { amc: validHash };

    const result = await checkSameUserAgent(
      request,
      reply,
      requestJws,
      clientId,
      redirectUri,
      state,
    );

    expect(result).toBe(true);
  });

  it("returns ErrorResponse when cookie is not set", async () => {
    request.cookies = {};

    const result = await checkSameUserAgent(
      request,
      reply,
      requestJws,
      clientId,
      redirectUri,
      state,
    );

    expect(result).toBeInstanceOf(ErrorResponse);
  });

  it("returns ErrorResponse when hash does not match", async () => {
    request.cookies = { amc: "invalid-hash" };

    const result = await checkSameUserAgent(
      request,
      reply,
      requestJws,
      clientId,
      redirectUri,
      state,
    );

    expect(result).toBeInstanceOf(ErrorResponse);
  });
});
