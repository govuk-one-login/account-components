import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { accountInterventionsServiceApi } from "./index.js";
import { SignJWT } from "jose";

describe("accountInterventionsServiceApi", () => {
  let mockApp: FastifyInstance;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockApp = {
      get: vi.fn(),
    } as unknown as FastifyInstance;

    mockRequest = {
      headers: {},
    };
    mockReply = {
      send: vi.fn(),
    };
  });

  it("should register routes", () => {
    accountInterventionsServiceApi(mockApp);

    expect(mockApp.get).toHaveBeenCalledTimes(1);
  });

  it("should return default state when no token is provided", async () => {
    accountInterventionsServiceApi(mockApp);

    const registeredHandler = vi.mocked(mockApp.get).mock
      .calls[0]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(mockReply.send).toHaveBeenCalledWith({
      state: {
        blocked: false,
        suspended: false,
        reproveIdentity: false,
        resetPassword: false,
      },
    });
  });

  it("should return default state when token has no scenario claim", async () => {
    accountInterventionsServiceApi(mockApp);

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("secret"));

    mockRequest.headers = { authorization: `Bearer ${token}` };

    const registeredHandler = vi.mocked(mockApp.get).mock
      .calls[0]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(mockReply.send).toHaveBeenCalledWith({
      state: {
        blocked: false,
        suspended: false,
        reproveIdentity: false,
        resetPassword: false,
      },
    });
  });

  it("should handle blocked scenario", async () => {
    accountInterventionsServiceApi(mockApp);

    const token = await new SignJWT({
      getUserAisStatus_scenario: "blocked",
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("secret"));

    mockRequest.headers = { authorization: `Bearer ${token}` };

    const registeredHandler = vi.mocked(mockApp.get).mock
      .calls[0]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(mockReply.send).toHaveBeenCalledWith({
      state: {
        blocked: true,
        suspended: false,
        reproveIdentity: false,
        resetPassword: false,
      },
    });
  });

  it("should handle suspended_no_actions_required scenario", async () => {
    accountInterventionsServiceApi(mockApp);

    const token = await new SignJWT({
      getUserAisStatus_scenario: "suspended_no_actions_required",
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("secret"));

    mockRequest.headers = { authorization: `Bearer ${token}` };

    const registeredHandler = vi.mocked(mockApp.get).mock
      .calls[0]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(mockReply.send).toHaveBeenCalledWith({
      state: {
        blocked: false,
        suspended: true,
        reproveIdentity: false,
        resetPassword: false,
      },
    });
  });

  it("should handle suspended_reset_password_required scenario", async () => {
    accountInterventionsServiceApi(mockApp);

    const token = await new SignJWT({
      getUserAisStatus_scenario: "suspended_reset_password_required",
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("secret"));

    mockRequest.headers = { authorization: `Bearer ${token}` };

    const registeredHandler = vi.mocked(mockApp.get).mock
      .calls[0]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(mockReply.send).toHaveBeenCalledWith({
      state: {
        blocked: false,
        suspended: true,
        reproveIdentity: false,
        resetPassword: true,
      },
    });
  });

  it("should handle suspended_reprove_identity_required scenario", async () => {
    accountInterventionsServiceApi(mockApp);

    const token = await new SignJWT({
      getUserAisStatus_scenario: "suspended_reprove_identity_required",
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("secret"));

    mockRequest.headers = { authorization: `Bearer ${token}` };

    const registeredHandler = vi.mocked(mockApp.get).mock
      .calls[0]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(mockReply.send).toHaveBeenCalledWith({
      state: {
        blocked: false,
        suspended: true,
        reproveIdentity: true,
        resetPassword: false,
      },
    });
  });

  it("should handle suspended_reset_password_and_reprove_identity_required scenario", async () => {
    accountInterventionsServiceApi(mockApp);

    const token = await new SignJWT({
      getUserAisStatus_scenario:
        "suspended_reset_password_and_reprove_identity_required",
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("secret"));

    mockRequest.headers = { authorization: `Bearer ${token}` };

    const registeredHandler = vi.mocked(mockApp.get).mock
      .calls[0]![1] as unknown as (...args: any) => any;

    await registeredHandler(mockRequest, mockReply);

    expect(mockReply.send).toHaveBeenCalledWith({
      state: {
        blocked: false,
        suspended: true,
        reproveIdentity: true,
        resetPassword: true,
      },
    });
  });
});
