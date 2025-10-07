import { expect, it, describe, vi, afterEach } from "vitest";
import { handler } from "./index.js";
import type { FastifyReply, FastifyRequest } from "fastify";

describe("robots.txt handler", () => {
  const mockReply = {
    type: vi.fn().mockImplementation(() => mockReply),
    send: vi.fn().mockImplementation(() => mockReply),
    header: vi.fn().mockImplementation(() => mockReply),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("disallows all crawling", async () => {
    await handler({} as FastifyRequest, mockReply as unknown as FastifyReply);

    expect(mockReply.type).toHaveBeenCalledExactlyOnceWith("text/plain");
    expect(mockReply.send).toHaveBeenCalledExactlyOnceWith(`User-agent: *
Disallow: /`);
    expect(mockReply.header).toHaveBeenCalledExactlyOnceWith(
      "cache-control",
      "public, max-age=300, immutable",
    );
  });
});
