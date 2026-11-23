import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { internalApi } from "./index.js";
import { SignJWT } from "jose";

const signToken = (claims: Record<string, unknown>) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode("secret"));

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
      query: { source: "account-delete" },
    };

    mockReply = {
      send: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  it("should register 3 POST routes and 1 GET route", () => {
    internalApi(mockApp);

    expect(mockApp.post).toHaveBeenCalledTimes(3);
    expect(mockApp.get).toHaveBeenCalledTimes(1);
  });

  describe("generateOTP", () => {
    const getHandler = () => {
      internalApi(mockApp);
      return vi.mocked(mockApp.post).mock.calls[0]![1] as unknown as (
        ...args: any
      ) => any;
    };

    it("should return otp and expires with provided expiresIn", async () => {
      const before = Math.floor(Date.now() / 1000);
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ otp: "192837", expiresAt: before + 300 }),
      );
    });

    it("should default expiresIn to 900 when not provided", async () => {
      mockRequest.body = {};
      const before = Math.floor(Date.now() / 1000);
      await getHandler()(mockRequest, mockReply);

      const sent = (
        vi.mocked(mockReply.send)?.mock.calls[0] as [
          { otp: string; expiresAt: number },
        ]
      )[0];

      expect(sent.otp).toBe("192837");
      expect(sent.expiresAt).toBeGreaterThanOrEqual(before + 900);
    });

    it("should return 400 for invalid body", async () => {
      mockRequest.body = { expiresIn: "not-a-number" };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 1001,
        message: "InvalidRequest",
      });
    });

    it("should return 403 for too_many_otps_requested scenario", async () => {
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({ generateOTP_scenario: "too_many_otps_requested" })}`,
      };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 1002,
        message: "TooManyOTPsRequested",
      });
    });

    it("should return otp and lockout for successful_with_lockout scenario", async () => {
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({ generateOTP_scenario: "successful_with_lockout" })}`,
      };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          otp: "192837",
          lockout: expect.objectContaining({
            id: expect.any(String),
            type: "TooManyOTPsRequested",
            lockedOutAt: expect.any(Number),
            lockedOutUntil: expect.any(Number),
          }),
        }),
      );
    });

    it("should return otp when token has an unrecognised scenario", async () => {
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({ generateOTP_scenario: "unknown" })}`,
      };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ otp: "192837" }),
      );
    });
  });

  describe("checkOTP", () => {
    const getHandler = () => {
      internalApi(mockApp);
      return vi.mocked(mockApp.post).mock.calls[1]![1] as unknown as (
        ...args: any
      ) => any;
    };

    it("should return { valid: true } when no token is provided", async () => {
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({ valid: true });
    });

    it("should return 403 for too_many_incorrect_otps_entered scenario", async () => {
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({ checkOTP_scenario: "too_many_incorrect_otps_entered" })}`,
      };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 1002,
        message: "TooManyIncorrectOTPsEntered",
      });
    });

    it("should return { valid: false } for incorrect_otp scenario", async () => {
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({ checkOTP_scenario: "incorrect_otp" })}`,
      };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({ valid: false });
    });

    it("should return { valid: false } and lockout for incorrect_otp_with_lockout scenario", async () => {
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({ checkOTP_scenario: "incorrect_otp_with_lockout" })}`,
      };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: false,
          lockout: expect.objectContaining({
            id: expect.any(String),
            type: "TooManyIncorrectOTPsEntered",
            lockedOutAt: expect.any(Number),
            lockedOutUntil: expect.any(Number),
          }),
        }),
      );
    });

    it("should return { valid: true } when token has an unrecognised scenario", async () => {
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({ checkOTP_scenario: "unknown" })}`,
      };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({ valid: true });
    });
  });

  describe("checkPassword", () => {
    const getHandler = () => {
      internalApi(mockApp);
      return vi.mocked(mockApp.post).mock.calls[2]![1] as unknown as (
        ...args: any
      ) => any;
    };

    it("should return { valid: true } when no token is provided", async () => {
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({ valid: true });
    });

    it("should return 403 for too_many_incorrect_passwords_entered scenario", async () => {
      // pragma: allowlist secret
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({ checkPassword_scenario: "too_many_incorrect_passwords_entered" })}`, // pragma: allowlist secret
      };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 1002,
        message: "TooManyIncorrectPasswordsEntered",
      });
    });

    it("should return { valid: false } for incorrect_password scenario", async () => {
      // pragma: allowlist secret
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({ checkPassword_scenario: "incorrect_password" })}`, // pragma: allowlist secret
      };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({ valid: false });
    });

    it("should return { valid: false } and lockout for incorrect_password_with_lockout scenario", async () => {
      // pragma: allowlist secret
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({ checkPassword_scenario: "incorrect_password_with_lockout" })}`, // pragma: allowlist secret
      };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: false,
          lockout: expect.objectContaining({
            id: expect.any(String),
            type: "TooManyIncorrectPasswordsEntered",
            lockedOutAt: expect.any(Number),
            lockedOutUntil: expect.any(Number),
          }),
        }),
      );
    });

    it("should return { valid: true } when token has an unrecognised scenario", async () => {
      // pragma: allowlist secret
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({ checkPassword_scenario: "unknown" })}`, // pragma: allowlist secret
      };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({ valid: true });
    });
  });

  describe("lockouts", () => {
    const getHandler = () => {
      internalApi(mockApp);
      return vi.mocked(mockApp.get).mock.calls[0]![1] as unknown as (
        ...args: any
      ) => any;
    };

    it("should return an empty array when no token is provided", async () => {
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith([]);
    });

    it("should return an empty array when token has no lockouts_scenario claim", async () => {
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({})}`,
      };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith([]);
    });

    it("should return an empty array for an unrecognised lockouts_scenario", async () => {
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({ lockouts_scenario: "unknown" })}`,
      };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith([]);
    });

    it("should return 400 when source query param is invalid", async () => {
      mockRequest.headers = {
        authorization: `Bearer ${await signToken({ lockouts_scenario: "locked_out_too_many_otps_requested" })}`,
      };
      mockRequest.query = { source: "invalid-source" };
      await getHandler()(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        code: 1001,
        message: "InvalidRequest",
      });
    });

    it.each([
      ["locked_out_too_many_otps_requested", "TooManyOTPsRequested"],
      [
        "locked_out_too_many_incorrect_otps_entered",
        "TooManyIncorrectOTPsEntered",
      ],
      [
        "locked_out_too_many_incorrect_passwords_entered",
        "TooManyIncorrectPasswordsEntered",
      ],
    ] as const)(
      "should return a lockout item for %s scenario",
      async (scenario, expectedType) => {
        mockRequest.headers = {
          authorization: `Bearer ${await signToken({ lockouts_scenario: scenario })}`,
        };
        await getHandler()(mockRequest, mockReply);

        expect(mockReply.send).toHaveBeenCalledWith([
          expect.objectContaining({
            id: expect.any(String),
            source: "account-delete",
            type: expectedType,
            lockedOutAt: expect.any(Number),
            lockedOutUntil: expect.any(Number),
          }),
        ]);
      },
    );
  });
});
