import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { accountDelete } from "./index.js";

vi.mock(import("./handlers/create.js"), () => ({
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

vi.mock(import("./handlers/enterPassword.js"), () => ({
  enterPasswordGetHandler: vi.fn(),
  enterPasswordPostHandler: vi.fn(),
}));

vi.mock(import("./handlers/success.js"), () => ({
  confirmGetHandler: vi.fn(),
  confirmPostHandler: vi.fn(),
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

    expect(mockGet).toHaveBeenCalledTimes(5);
    expect(mockPost).toHaveBeenCalledTimes(5);
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

  it("registers enterPassword routes", () => {
    accountDelete(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/delete-account/enter-password",
      expect.any(Function),
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/delete-account/enter-password",
      expect.any(Function),
    );
  });

  it("registers confirm routes", () => {
    accountDelete(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/delete-account/confirm",
      expect.any(Function),
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/delete-account/confirm",
      expect.any(Function),
    );
  });
});
