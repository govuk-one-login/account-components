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

    it.each([
      [
        "too_many_otps_requested",
        { code: 1002, message: "TooManyOTPsRequested" },
      ],
      [
        "too_many_incorrect_otps_entered",
        { code: 1003, message: "TooManyIncorrectOTPsEntered" },
      ],
      [
        "too_many_incorrect_passwords_entered",
        { code: 1004, message: "TooManyIncorrectPasswordsEntered" },
      ],
    ] as const)(
      "should return 403 for %s scenario",
      async (scenario, expectedBody) => {
        internalApi(mockApp);

        mockRequest.headers = {
          authorization: `Bearer ${await signToken({ generateOTP_scenario: scenario })}`,
        };

        const registeredHandler = vi.mocked(mockApp.post).mock
          .calls[0]![1] as unknown as (...args: any) => any;

        await registeredHandler(mockRequest, mockReply);

        expect(mockReply.status).toHaveBeenCalledWith(403);
        expect(mockReply.send).toHaveBeenCalledWith(expectedBody);
      },
    );
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

    it.each([
      [
        "too_many_otps_requested",
        { code: 1002, message: "TooManyOTPsRequested" },
      ],
      [
        "too_many_incorrect_otps_entered",
        { code: 1003, message: "TooManyIncorrectOTPsEntered" },
      ],
      [
        "too_many_incorrect_passwords_entered",
        { code: 1004, message: "TooManyIncorrectPasswordsEntered" },
      ],
      ["incorrect_otp", { code: 1005, message: "InvalidOTP" }],
    ] as const)(
      "should return 403 for %s scenario",
      async (scenario, expectedBody) => {
        internalApi(mockApp);

        mockRequest.headers = {
          authorization: `Bearer ${await signToken({ checkOTP_scenario: scenario })}`,
        };

        const registeredHandler = vi.mocked(mockApp.post).mock
          .calls[1]![1] as unknown as (...args: any) => any;

        await registeredHandler(mockRequest, mockReply);

        expect(mockReply.status).toHaveBeenCalledWith(403);
        expect(mockReply.send).toHaveBeenCalledWith(expectedBody);
      },
    );
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

    it.each([
      [
        "too_many_otps_requested",
        { code: 1002, message: "TooManyOTPsRequested" },
      ], // pragma: allowlist secret
      [
        "too_many_incorrect_otps_entered",
        { code: 1003, message: "TooManyIncorrectOTPsEntered" },
      ], // pragma: allowlist secret
      [
        "too_many_incorrect_passwords_entered",
        { code: 1004, message: "TooManyIncorrectPasswordsEntered" },
      ], // pragma: allowlist secret
      ["incorrect_password", { code: 1005, message: "InvalidPassword" }], // pragma: allowlist secret
    ] as const)(
      "should return 403 for %s scenario",
      async (scenario, expectedBody) => {
        internalApi(mockApp);

        mockRequest.headers = {
          authorization: `Bearer ${await signToken({ checkPassword_scenario: scenario })}`,
        };

        const registeredHandler = vi.mocked(mockApp.post).mock
          .calls[2]![1] as unknown as (...args: any) => any;

        await registeredHandler(mockRequest, mockReply);

        expect(mockReply.status).toHaveBeenCalledWith(403);
        expect(mockReply.send).toHaveBeenCalledWith(expectedBody);
      },
    );
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

      mockRequest.headers = {
        authorization: `Bearer ${await signToken({})}`,
      };

      const registeredHandler = vi.mocked(mockApp.get).mock
        .calls[0]![1] as unknown as (...args: any) => any;

      await registeredHandler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith([]);
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
        internalApi(mockApp);

        mockRequest.headers = {
          authorization: `Bearer ${await signToken({ lockouts_scenario: scenario })}`,
        };

        const registeredHandler = vi.mocked(mockApp.get).mock
          .calls[0]![1] as unknown as (...args: any) => any;

        await registeredHandler(mockRequest, mockReply);

        expect(mockReply.send).toHaveBeenCalledWith([
          expect.objectContaining({
            ...lockoutDatabaseItemShape,
            type: expectedType,
          }),
        ]);
      },
    );
  });
});
