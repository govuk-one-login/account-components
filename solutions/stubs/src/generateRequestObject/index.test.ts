import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { generateRequestObject } from "./index.js";

vi.mock(import("./handlers/post.js"), () => ({
  generateRequestObjectPost: vi.fn(),
}));

describe("generateRequestObject", () => {
  let mockApp: FastifyInstance;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockApp = {
      post: vi.fn(),
      get: vi.fn(),
    } as unknown as FastifyInstance;

    mockRequest = {};
    mockReply = {};
  });

  it("should register routes", () => {
    generateRequestObject(mockApp);

    expect(mockApp.post).toHaveBeenCalledTimes(2);
  });

  it("should call generateRequestObjectPost handler when route is invoked", async () => {
    const { generateRequestObjectPost } = await import("./handlers/post.js");

    generateRequestObject(mockApp);

    const registeredHandler = vi.mocked(mockApp.post).mock
      .calls[0]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(generateRequestObjectPost).toHaveBeenCalledExactlyOnceWith(
      mockRequest,
      mockReply,
    );
  });
});
