import { expect, it, describe, vi, beforeEach } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";

const mockDestroySession = vi.fn();
const mockDestroyApiSession = vi.fn();

vi.mock(import("./session.js"), () => ({
  destroySession: mockDestroySession,
}));

vi.mock(import("./apiSession.js"), () => ({
  destroyApiSession: mockDestroyApiSession,
}));

const { redirectToAuthorizeErrorPage } =
  await import("./redirectToAuthorizeErrorPage.js");

describe("redirectToAuthorizeErrorPage", () => {
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;

  beforeEach(() => {
    mockRequest = {} as FastifyRequest;
    mockReply = {
      redirect: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    mockDestroySession.mockResolvedValue(undefined);
    mockDestroyApiSession.mockResolvedValue(undefined);
  });

  it("destroys both sessions and redirects to authorize error page", async () => {
    const result = await redirectToAuthorizeErrorPage(mockRequest, mockReply);

    expect(mockDestroyApiSession).toHaveBeenCalledWith(mockRequest, mockReply);
    expect(mockDestroySession).toHaveBeenCalledWith(mockRequest);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
    expect(result).toBe(mockReply);
  });
});
