import { describe, it, expect, beforeEach, vi } from "vitest";
import { accountDataApi } from "./index.js";
import type { FastifyInstance } from "fastify";

describe("passkeys stub tests", () => {
  let mockApp: FastifyInstance;

  beforeEach(() => {
    mockApp = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    } as unknown as FastifyInstance;
  });

  it("should register routes", () => {
    accountDataApi(mockApp);

    expect(mockApp.get).toHaveBeenCalledTimes(1);
    expect(mockApp.post).toHaveBeenCalledTimes(1);
    expect(mockApp.delete).toHaveBeenCalledTimes(1);
    expect(mockApp.patch).toHaveBeenCalledTimes(1);
  });
});
