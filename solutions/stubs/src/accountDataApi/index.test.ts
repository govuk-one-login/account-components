import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { accountDataApi } from "./index.js";

// @ts-expect-error
vi.mock(import("../utils/paths.js"), () => ({
  paths: {
    accountDataApi: {
      getPasskeys:
        "/account-data-api/accounts/:publicSubjectId/authenticators/passkeys",
      createPasskey:
        "/account-data-api/accounts/:publicSubjectId/authenticators/passkeys",
    },
  },
}));

vi.mock(import("./handlers/passkeys.js"), () => ({
  passkeysGetHandler: vi.fn(),
  passkeysPostHandler: vi.fn(),
}));

describe("accountDataApi", () => {
  let mockApp: FastifyInstance;

  beforeEach(() => {
    mockApp = {
      get: vi.fn(),
      post: vi.fn(),
    } as unknown as FastifyInstance;
  });

  it("should register routes", () => {
    accountDataApi(mockApp);

    expect(mockApp.get).toHaveBeenCalledTimes(1);
    expect(mockApp.get).toHaveBeenCalledWith(
      "/account-data-api/accounts/:publicSubjectId/authenticators/passkeys",
      expect.any(Function),
    );
    expect(mockApp.post).toHaveBeenCalledTimes(1);
    expect(mockApp.post).toHaveBeenCalledWith(
      "/account-data-api/accounts/:publicSubjectId/authenticators/passkeys",
      expect.any(Function),
    );
  });

  it("should call passkeysGetHandler when GET route is invoked", async () => {
    const { passkeysGetHandler } = await import("./handlers/passkeys.js");
    accountDataApi(mockApp);

    const registeredHandler = vi.mocked(mockApp.get).mock
      .calls[0]![1] as unknown as (...args: any) => any;
    const mockRequest = {};
    const mockReply = {};

    await registeredHandler(mockRequest, mockReply);

    expect(passkeysGetHandler).toHaveBeenCalledWith(mockRequest, mockReply);
  });

  it("should call passkeysPostHandler when POST route is invoked", async () => {
    const { passkeysPostHandler } = await import("./handlers/passkeys.js");
    accountDataApi(mockApp);

    const registeredHandler = vi.mocked(mockApp.post).mock
      .calls[0]![1] as unknown as (...args: any) => any;
    const mockRequest = {};
    const mockReply = {};

    await registeredHandler(mockRequest, mockReply);

    expect(passkeysPostHandler).toHaveBeenCalledWith(mockRequest, mockReply);
  });
});
