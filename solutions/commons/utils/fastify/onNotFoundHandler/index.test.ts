import { expect, it, describe, vi, afterEach, beforeEach } from "vitest";
import { onNotFound } from "./index.js";
import type { FastifyReply } from "fastify";

describe("onNotFound handler", () => {
  let mockReply: FastifyReply;

  beforeEach(() => {
    mockReply = {
      statusCode: 200,
      render: vi.fn(),
      send: vi.fn(),
    } as unknown as FastifyReply;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sets status code to 404", async () => {
    await onNotFound(mockReply);

    expect(mockReply.statusCode).toBe(404);
  });

  it("sends default not found message when no pathToTemplate provided", async () => {
    await onNotFound(mockReply);

    expect(mockReply.send).toHaveBeenCalledExactlyOnceWith("Not found");
    expect(mockReply.render).not.toHaveBeenCalled();
  });

  it("renders custom template when pathToTemplate is provided", async () => {
    const customPath = "custom/error/404.njk";

    await onNotFound(mockReply, customPath);

    expect(mockReply.render).toHaveBeenCalledExactlyOnceWith(customPath);
    expect(mockReply.send).not.toHaveBeenCalled();
  });
});
