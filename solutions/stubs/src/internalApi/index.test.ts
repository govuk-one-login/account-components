import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { internalApi } from "./index.js";
import { SignJWT } from "jose";

describe("internalApi", () => {
  let mockApp: FastifyInstance;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockApp = {
      post: vi.fn(),
      get: vi.fn(),
    } as unknown as FastifyInstance;

    mockRequest = {
      headers: {},
      body: { expiresIn: 300 },
      params: { publicSubjectId: "test-subject-id" },
      query: { source: "account-delete" },
    };
    mockReply = {
      send: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  it("should register routes", () => {
    internalApi(mockApp);

    expect(mockApp.post).toHaveBeenCalledTimes(3);
    expect(mockApp.get).toHaveBeenCalledTimes(1);
  });

  describe("generateOTP", () => {
    it("should return otp and expires when no token is provided", async () => {
      internalApi(mockApp);

      const registeredHandler = vi.mocked(mockApp.post).mock
        .calls[0]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ otp: "192837" }),
      );
    });

    it("should return 403 too_many_otps_requested scenario", async () => {
      internalApi(mockApp);

      const token = await new SignJWT({
        generateOTP_scenario: "too_many_otps_requested",
      })
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode("secret"));

      mockRequest.headers = { authorization: `Bearer ${token}` };

      const registeredHandler = vi.mocked(mockApp.post).mock
        .calls[0]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 1002,
        message: "TooManyOTPsRequested",
      });
    });

    it("should return 403 for too_many_incorrect_otps_entered scenario", async () => {
      internalApi(mockApp);

      const token = await new SignJWT({
        generateOTP_scenario: "too_many_incorrect_otps_entered",
      })
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode("secret"));

      mockRequest.headers = { authorization: `Bearer ${token}` };

      const registeredHandler = vi.mocked(mockApp.post).mock
        .calls[0]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 1003,
        message: "TooManyIncorrectOTPsEntered",
      });
    });
  });

  describe("checkOTP", () => {
    it("should return 204 when no token is provided", async () => {
      internalApi(mockApp);

      const registeredHandler = vi.mocked(mockApp.post).mock
        .calls[1]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockReply.send).toHaveBeenCalledWith();
    });

    it("should return 403 for too_many_incorrect_otps_entered scenario", async () => {
      internalApi(mockApp);

      const token = await new SignJWT({
        checkOTP_scenario: "too_many_incorrect_otps_entered",
      })
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode("secret"));

      mockRequest.headers = { authorization: `Bearer ${token}` };

      const registeredHandler = vi.mocked(mockApp.post).mock
        .calls[1]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 1002,
        message: "TooManyIncorrectOTPsEntered",
      });
    });

    it("should return 403 for incorrect_otp scenario", async () => {
      internalApi(mockApp);

      const token = await new SignJWT({
        checkOTP_scenario: "incorrect_otp",
      })
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode("secret"));

      mockRequest.headers = { authorization: `Bearer ${token}` };

      const registeredHandler = vi.mocked(mockApp.post).mock
        .calls[1]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 1003,
        message: "InvalidOTP",
      });
    });
  });

  describe("checkPassword", () => {
    it("should return 204 when no token is provided", async () => {
      internalApi(mockApp);

      const registeredHandler = vi.mocked(mockApp.post).mock
        .calls[2]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockReply.send).toHaveBeenCalledWith();
    });

    it("should return 403 for too_many_incorrect_passwords_entered scenario", async () => {
      internalApi(mockApp);

      const token = await new SignJWT({
        checkPassword_scenario: "too_many_incorrect_passwords_entered", // pragma: allowlist secret
      })
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode("secret"));

      mockRequest.headers = { authorization: `Bearer ${token}` };

      const registeredHandler = vi.mocked(mockApp.post).mock
        .calls[2]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 1002,
        message: "TooManyIncorrectPasswordsEntered",
      });
    });

    it("should return 403 for incorrect_password scenario", async () => {
      internalApi(mockApp);

      const token = await new SignJWT({
        checkPassword_scenario: "incorrect_password", // pragma: allowlist secret
      })
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode("secret"));

      mockRequest.headers = { authorization: `Bearer ${token}` };

      const registeredHandler = vi.mocked(mockApp.post).mock
        .calls[2]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 1003,
        message: "InvalidPassword",
      });
    });
  });

  describe("lockouts", () => {
    const lockoutDatabaseItemShape = {
      id: expect.any(String),
      publicSubjectId: "test-subject-id",
      lockedOutAt: expect.any(Number),
      lockedOutUntil: expect.any(Number),
      source: "account-delete",
    };

    it("should return an empty array when no token is provided", async () => {
      internalApi(mockApp);

      const registeredHandler = vi.mocked(mockApp.get).mock
        .calls[0]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith([]);
    });

    it("should return an empty array when token has no scenario claim", async () => {
      internalApi(mockApp);

      const token = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode("secret"));

      mockRequest.headers = { authorization: `Bearer ${token}` };

      const registeredHandler = vi.mocked(mockApp.get).mock
        .calls[0]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith([]);
    });

    it("should return a lockout item for locked_out_too_many_otps_requested scenario", async () => {
      internalApi(mockApp);

      const token = await new SignJWT({
        lockouts_scenario: "locked_out_too_many_otps_requested",
      })
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode("secret"));

      mockRequest.headers = { authorization: `Bearer ${token}` };

      const registeredHandler = vi.mocked(mockApp.get).mock
        .calls[0]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith([
        expect.objectContaining({
          ...lockoutDatabaseItemShape,
          type: "TooManyOTPsRequested",
        }),
      ]);
    });

    it("should return a lockout item for locked_out_too_many_incorrect_otps_entered scenario", async () => {
      internalApi(mockApp);

      const token = await new SignJWT({
        lockouts_scenario: "locked_out_too_many_incorrect_otps_entered",
      })
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode("secret"));

      mockRequest.headers = { authorization: `Bearer ${token}` };

      const registeredHandler = vi.mocked(mockApp.get).mock
        .calls[0]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith([
        expect.objectContaining({
          ...lockoutDatabaseItemShape,
          type: "TooManyIncorrectOTPsEntered",
        }),
      ]);
    });

    it("should return a lockout item for locked_out_too_many_incorrect_passwords_entered scenario", async () => {
      internalApi(mockApp);

      const token = await new SignJWT({
        lockouts_scenario: "locked_out_too_many_incorrect_passwords_entered",
      })
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode("secret"));

      mockRequest.headers = { authorization: `Bearer ${token}` };

      const registeredHandler = vi.mocked(mockApp.get).mock
        .calls[0]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith([
        expect.objectContaining({
          ...lockoutDatabaseItemShape,
          type: "TooManyIncorrectPasswordsEntered",
        }),
      ]);
    });
  });
});
