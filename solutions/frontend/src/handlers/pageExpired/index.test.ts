import { expect, it, describe, vi, afterEach, beforeEach } from "vitest";
import { handler } from "./index.js";
import type { FastifyReply, FastifyRequest } from "fastify";

describe("pageExpired handler", () => {
  const mockReply = {
    status: vi.fn(),
    render: vi.fn(),
  };

  beforeEach(() => {
    mockReply.status.mockImplementation(() => mockReply);
    mockReply.render.mockResolvedValue(mockReply);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sets status to 401 and renders error template", async () => {
    const result = await handler(
      {} as FastifyRequest,
      mockReply as unknown as FastifyReply,
    );

    expect(mockReply.status).toHaveBeenCalledExactlyOnceWith(401);
    expect(mockReply.render).toHaveBeenCalledExactlyOnceWith(
      "handlers/pageExpired/index.njk",
    );
    expect(result).toBe(mockReply);
  });

  it("throws assertion error when reply.render is not available", async () => {
    const mockReplyWithoutRender = {
      status: vi.fn().mockImplementation(() => mockReplyWithoutRender),
    };

    await expect(
      handler(
        {} as FastifyRequest,
        mockReplyWithoutRender as unknown as FastifyReply,
      ),
    ).rejects.toThrow();
  });
});
