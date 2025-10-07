import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeTrailingSlash } from "./index.js";
import type { FastifyRequest, FastifyReply } from "fastify";

describe("removeTrailingSlash", () => {
  let reply: Partial<FastifyReply>;

  beforeEach(() => {
    reply = {
      redirect: vi.fn(),
    };
  });

  it("should redirect when URL has trailing slash", async () => {
    const request = { url: "/path/" };

    await removeTrailingSlash(request as FastifyRequest, reply as FastifyReply);

    expect(reply.redirect).toHaveBeenCalledWith("/path", 308);
  });

  it("should redirect with query params when URL has trailing slash", async () => {
    const request = { url: "/path/?query=value" };

    await removeTrailingSlash(request as FastifyRequest, reply as FastifyReply);

    expect(reply.redirect).toHaveBeenCalledWith("/path?query=value", 308);
  });

  it("should not redirect root path", async () => {
    const request = { url: "/" };

    await removeTrailingSlash(request as FastifyRequest, reply as FastifyReply);

    expect(reply.redirect).not.toHaveBeenCalled();
  });

  it("should not redirect when URL has no trailing slash", async () => {
    const request = { url: "/path?query=value" };

    await removeTrailingSlash(request as FastifyRequest, reply as FastifyReply);

    expect(reply.redirect).not.toHaveBeenCalled();
  });
});
