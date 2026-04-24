import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { notify } from "./index.js";

// @ts-expect-error
vi.mock(import("../utils/paths.js"), () => ({
  paths: {
    notify: {
      sendEmail: "/notify/send-email",
    },
  },
}));

vi.mock(import("./handlers/sendEmail.js"), () => ({
  sendEmailPostHandler: vi.fn(),
}));

describe("notify", () => {
  let mockApp: FastifyInstance;

  beforeEach(() => {
    mockApp = {
      post: vi.fn(),
    } as unknown as FastifyInstance;
  });

  it("should register the sendEmail POST route", () => {
    notify(mockApp);

    expect(mockApp.post).toHaveBeenCalledTimes(1);
    expect(mockApp.post).toHaveBeenCalledWith(
      "/notify/send-email",
      expect.any(Function),
    );
  });

  it("should call sendEmailPostHandler when POST route is invoked", async () => {
    const { sendEmailPostHandler } = await import("./handlers/sendEmail.js");
    notify(mockApp);

    const registeredHandler = vi.mocked(mockApp.post).mock
      .calls[0]![1] as unknown as (...args: any) => any;
    const mockRequest = {};
    const mockReply = {};

    await registeredHandler(mockRequest, mockReply);

    expect(sendEmailPostHandler).toHaveBeenCalledWith(mockRequest, mockReply);
  });
});
