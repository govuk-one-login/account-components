import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { accountDataApi } from "./index.js";

// @ts-expect-error
vi.mock(import("../utils/paths.js"), () => ({
  paths: {
    accountDataApi: {
      createPasskey:
        "/account-data-api/accounts/:publicSubjectId/authenticators/passkeys",
    },
  },
}));

vi.mock(import("./handlers/passkeys.js"), () => ({
  passkeysPostHandler: vi.fn(),
}));

describe("accountDataApi", () => {
  let mockApp: FastifyInstance;

  beforeEach(() => {
    mockApp = {
      post: vi.fn(),
    } as unknown as FastifyInstance;
  });

  it("should register routes", () => {
    accountDataApi(mockApp);

    expect(mockApp.post).toHaveBeenCalledTimes(1);
    expect(mockApp.post).toHaveBeenCalledWith(
      "/account-data-api/accounts/:publicSubjectId/authenticators/passkeys",
      expect.any(Function),
    );
  });

  it("should call passkeysPostHandler when route is invoked", async () => {
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
