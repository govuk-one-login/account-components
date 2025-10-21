import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { clientJwks } from "./index.js";

vi.mock(import("./handlers/getJwks.js"), () => ({
  getJwks: vi.fn(),
}));

describe("clientJwks", () => {
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
    clientJwks(mockApp);

    expect(mockApp.get).toHaveBeenCalledWith(
      "/:client/.well-known/jwks.json",
      expect.any(Function),
    );
  });

  it("should call getJwks handler when route is invoked", async () => {
    const { getJwks } = await import("./handlers/getJwks.js");

    clientJwks(mockApp);

    const registeredHandler = vi.mocked(mockApp.get).mock
      .calls[0]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(getJwks).toHaveBeenCalledExactlyOnceWith(mockRequest, mockReply);
  });
});
