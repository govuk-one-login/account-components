import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { testingJourney } from "./index.js";

vi.mock(import("./handlers.js"), () => ({
  step1GetHandler: vi.fn(),
  step1PostHandler: vi.fn(),
  enterPasswordGetHandler: vi.fn(),
  enterPasswordPostHandler: vi.fn(),
  confirmGetHandler: vi.fn(),
  confirmPostHandler: vi.fn(),
}));

describe("testingJourney", () => {
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
    testingJourney(mockFastify);

    expect(mockGet).toHaveBeenCalledTimes(3);
    expect(mockPost).toHaveBeenCalledTimes(3);
  });

  it("registers step1 routes", () => {
    testingJourney(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/testing-journey/step-1",
      expect.any(Function),
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/testing-journey/step-1",
      expect.any(Function),
    );
  });

  it("registers enterPassword routes", () => {
    testingJourney(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/testing-journey/enter-password",
      expect.any(Function),
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/testing-journey/enter-password",
      expect.any(Function),
    );
  });

  it("registers confirm routes", () => {
    testingJourney(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/testing-journey/confirm",
      expect.any(Function),
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/testing-journey/confirm",
      expect.any(Function),
    );
  });
});
