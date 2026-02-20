import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { passkeyCreate } from "./index.js";

vi.mock(import("./handlers/create.js"), () => ({
  getHandler: vi.fn(),
  postHandler: vi.fn(),
}));

describe("passkeyCreate", () => {
  let mockFastify: FastifyInstance;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockPost: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGet = vi.fn();
    mockPost = vi.fn();

    mockFastify = {
      get: mockGet,
      post: mockPost,
    } as unknown as FastifyInstance;
  });

  it("registers all routes", () => {
    passkeyCreate(mockFastify);

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it("registers create GET route", () => {
    passkeyCreate(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/passkeys/create",
      expect.any(Function),
    );
  });

  it("registers create POST route", () => {
    passkeyCreate(mockFastify);

    expect(mockPost).toHaveBeenCalledWith(
      "/passkeys/create",
      expect.any(Function),
    );
  });
});
