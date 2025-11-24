import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { accountDelete } from "./index.js";

vi.mock(import("./handlers/introduction.js"), () => ({
  introductionGetHandler: vi.fn(),
  introductionPostHandler: vi.fn(),
}));

vi.mock(import("./handlers/resendEmailVerificationCode.js"), () => ({
  resendEmailVerificationCodeGetHandler: vi.fn(),
  resendEmailVerificationCodePostHandler: vi.fn(),
}));

vi.mock(import("./handlers/verifyEmailAddress.js"), () => ({
  verifyEmailAddressGetHandler: vi.fn(),
  verifyEmailAddressPostHandler: vi.fn(),
}));

describe("accountDelete", () => {
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
    accountDelete(mockFastify);

    expect(mockGet).toHaveBeenCalledTimes(3);
    expect(mockPost).toHaveBeenCalledTimes(3);
  });

  it("registers introduction routes", () => {
    accountDelete(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/delete-account/introduction",
      expect.any(Function),
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/delete-account/introduction",
      expect.any(Function),
    );
  });

  it("registers resendEmailVerificationCode routes", () => {
    accountDelete(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/delete-account/resend-verification-code",
      expect.any(Function),
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/delete-account/resend-verification-code",
      expect.any(Function),
    );
  });

  it("registers verifyEmailAddress routes", () => {
    accountDelete(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/delete-account/verify-email-address",
      expect.any(Function),
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/delete-account/verify-email-address",
      expect.any(Function),
    );
  });
});
