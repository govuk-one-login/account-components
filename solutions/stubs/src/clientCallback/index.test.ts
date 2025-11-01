import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { clientCallback } from "./index.js";

vi.mock(import("./handlers/clientCallback.js"), () => ({
  handler: vi.fn(),
}));

describe("clientCallback", () => {
  let mockApp: FastifyInstance;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockApp = {
      get: vi.fn(),
    } as unknown as FastifyInstance;

    mockRequest = {};
    mockReply = {};
  });

  it("should register GET route with correct path", () => {
    clientCallback(mockApp);

    expect(mockApp.get).toHaveBeenCalledWith(
      "/:client/callback",
      expect.any(Function),
    );
  });

  it("should call handler when route is invoked", async () => {
    const { handler } = await import("./handlers/clientCallback.js");

    clientCallback(mockApp);

    const registeredHandler = vi.mocked(mockApp.get).mock
      .calls[0]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(handler).toHaveBeenCalledExactlyOnceWith(mockRequest, mockReply);
  });
});
