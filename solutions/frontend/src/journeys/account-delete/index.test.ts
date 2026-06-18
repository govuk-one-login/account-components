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

vi.mock(import("./handlers/enterPassword.js"), () => ({
  enterPasswordGetHandler: vi.fn(),
  enterPasswordPostHandler: vi.fn(),
}));

vi.mock(import("./handlers/confirm.js"), () => ({
  confirmGetHandler: vi.fn(),
  confirmPostHandler: vi.fn(),
}));

vi.mock(
  import("./handlers/lockedOutSecurityCodeEnteredTooManyTimes.js"),
  () => ({
    lockedOutSecurityCodeEnteredTooManyTimesGetHandler: vi.fn(),
  }),
);

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

    expect(mockGet).toHaveBeenCalledTimes(6);
    expect(mockPost).toHaveBeenCalledTimes(5);
  });

  it("registers introduction routes", () => {
    accountDelete(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/reset-delete/start",
      expect.any(Function),
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/reset-delete/start",
      expect.any(Function),
    );
  });

  it("registers resendEmailVerificationCode routes", () => {
    accountDelete(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/reset-delete/resend-email-code",
      expect.any(Function),
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/reset-delete/resend-email-code",
      expect.any(Function),
    );
  });

  it("registers verifyEmailAddress routes", () => {
    accountDelete(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/reset-delete/check-email",
      expect.any(Function),
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/reset-delete/check-email",
      expect.any(Function),
    );
  });

  it("registers enterPassword routes", () => {
    accountDelete(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/reset-delete/enter-password",
      expect.any(Function),
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/reset-delete/enter-password",
      expect.any(Function),
    );
  });

  it("registers confirm routes", () => {
    accountDelete(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/reset-delete/confirm",
      expect.any(Function),
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/reset-delete/confirm",
      expect.any(Function),
    );
  });

  it("registers lockedOutSecurityCodeEnteredTooManyTimes route", () => {
    accountDelete(mockFastify);

    expect(mockGet).toHaveBeenCalledWith(
      "/reset-delete/security-code-entered-exceeded",
      expect.any(Function),
    );
  });
});
