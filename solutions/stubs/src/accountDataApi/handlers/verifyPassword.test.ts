import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyPasswordPostHandler } from "./verifyPassword.js";
import { decodeJwt } from "jose";

vi.mock(import("jose"), () => ({
  decodeJwt: vi.fn(),
}));

describe("verifyPasswordPostHandler", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      headers: {},
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  it("should return 401 when authorization header is missing", async () => {
    await verifyPasswordPostHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockReply.status).toHaveBeenCalledWith(401);
    expect(mockReply.send).toHaveBeenCalledWith();
  });

  it("should return verified true when token has no scenario claim", async () => {
    vi.mocked(decodeJwt).mockReturnValue({});

    mockRequest.headers = { authorization: "Bearer token" };

    await verifyPasswordPostHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockReply.send).toHaveBeenCalledWith({ verified: true });
  });

  it("should return verified false when token has unsuccessful_verification scenario", async () => {
    vi.mocked(decodeJwt).mockReturnValue({
      verifyPassword_scenario: "unsuccessful_verification",
    });

    mockRequest.headers = { authorization: "Bearer token" };

    await verifyPasswordPostHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockReply.send).toHaveBeenCalledWith({ verified: false });
  });
});
