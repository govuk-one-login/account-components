import { beforeEach, describe, expect, it, vi } from "vitest";
import { addDefaultCaching } from "./index.js";
import type { FastifyReply } from "fastify";

describe("addDefaultCaching", () => {
  let reply: Partial<FastifyReply>;

  beforeEach(() => {
    reply = {
      getHeader: vi.fn(),
      header: vi.fn(),
    };
  });

  it("should add no-cache header when cache-control is undefined", async () => {
    vi.mocked(reply.getHeader!).mockReturnValue(undefined);

    await addDefaultCaching(reply as FastifyReply);

    expect(reply.header).toHaveBeenCalledWith("cache-control", "no-cache");
  });

  it("should not add header when cache-control already exists", async () => {
    vi.mocked(reply.getHeader!).mockReturnValue("max-age=3600");

    await addDefaultCaching(reply as FastifyReply);

    expect(reply.header).not.toHaveBeenCalled();
  });
});
