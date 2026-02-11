import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { accountManagementApi } from "./index.js";
import { SignJWT } from "jose";

describe("accountManagementApi", () => {
  let mockApp: FastifyInstance;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockApp = {
      post: vi.fn(),
    } as unknown as FastifyInstance;

    mockRequest = {
      headers: {},
    };
    mockReply = {
      send: vi.fn(),
      status: vi.fn(),
    } as unknown as Partial<FastifyReply>;
  });

  it("should register routes", () => {
    accountManagementApi(mockApp);

    expect(mockApp.post).toHaveBeenCalledTimes(4);
  });

  it("should handle verifyOtpChallenge with invalid_otp_code scenario", async () => {
    accountManagementApi(mockApp);

    const token = await new SignJWT({
      verifyOtpChallenge_scenario: "invalid_otp_code",
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("secret"));

    mockRequest.headers = { authorization: `Bearer ${token}` };

    const registeredHandler = vi.mocked(mockApp.post).mock
      .calls[3]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith({
      code: 1020,
      message: "Invalid OTP code",
    });
  });

  it("should handle verifyOtpChallenge without invalid scenario", async () => {
    accountManagementApi(mockApp);

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("secret"));

    mockRequest.headers = { authorization: `Bearer ${token}` };

    const registeredHandler = vi.mocked(mockApp.post).mock
      .calls[3]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(mockReply.send).toHaveBeenCalledWith();
  });

  it("should return 401 for authenticate without authorization header", async () => {
    accountManagementApi(mockApp);

    const registeredHandler = vi.mocked(mockApp.post).mock
      .calls[0]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 for deleteAccount without authorization header", async () => {
    accountManagementApi(mockApp);

    const registeredHandler = vi.mocked(mockApp.post).mock
      .calls[1]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 for sendOtpChallenge without authorization header", async () => {
    accountManagementApi(mockApp);

    const registeredHandler = vi.mocked(mockApp.post).mock
      .calls[2]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 for verifyOtpChallenge without authorization header", async () => {
    accountManagementApi(mockApp);

    const registeredHandler = vi.mocked(mockApp.post).mock
      .calls[3]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(401);
  });
});
