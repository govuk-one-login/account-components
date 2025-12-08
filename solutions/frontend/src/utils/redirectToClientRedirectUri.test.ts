import { expect, it, describe, vi, beforeEach } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { authorizeErrors } from "../../../commons/utils/authorize/authorizeErrors.js";

const mockGetRedirectToClientRedirectUri = vi.fn();
const mockDestroySession = vi.fn();
const mockDestroyApiSession = vi.fn();

vi.mock(
  import("../../../commons/utils/authorize/getRedirectToClientRedirectUri.js"),
  () => ({
    getRedirectToClientRedirectUri: mockGetRedirectToClientRedirectUri,
  }),
);

vi.mock(import("./session.js"), () => ({
  destroySession: mockDestroySession,
}));

vi.mock(import("./apiSession.js"), () => ({
  destroyApiSession: mockDestroyApiSession,
}));

const { redirectToClientRedirectUri } =
  await import("./redirectToClientRedirectUri.js");

describe("redirectToClientRedirectUri", () => {
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;

  beforeEach(() => {
    mockRequest = {} as FastifyRequest;
    mockReply = {
      redirect: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    mockGetRedirectToClientRedirectUri.mockReturnValue(
      "https://example.com/callback",
    );
    mockDestroySession.mockResolvedValue(undefined);
    mockDestroyApiSession.mockResolvedValue(undefined);
  });

  it("destroys both sessions and redirects to client redirect URI", async () => {
    const redirectUri = "https://client.example.com/callback";

    const result = await redirectToClientRedirectUri(
      mockRequest,
      mockReply,
      redirectUri,
    );

    expect(mockDestroyApiSession).toHaveBeenCalledWith(mockRequest, mockReply);
    expect(mockDestroySession).toHaveBeenCalledWith(mockRequest);
    expect(mockGetRedirectToClientRedirectUri).toHaveBeenCalledWith(
      redirectUri,
      undefined,
      undefined,
      undefined,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockReply.redirect).toHaveBeenCalledWith(
      "https://example.com/callback",
    );
    expect(result).toBe(mockReply);
  });

  it("includes error in redirect when provided", async () => {
    const redirectUri = "https://client.example.com/callback";
    const error = authorizeErrors.userAborted;

    await redirectToClientRedirectUri(
      mockRequest,
      mockReply,
      redirectUri,
      error,
    );

    expect(mockGetRedirectToClientRedirectUri).toHaveBeenCalledWith(
      redirectUri,
      error,
      undefined,
      undefined,
    );
  });

  it("includes state in redirect when provided", async () => {
    const redirectUri = "https://client.example.com/callback";
    const state = "test-state";

    await redirectToClientRedirectUri(
      mockRequest,
      mockReply,
      redirectUri,
      undefined,
      state,
    );

    expect(mockGetRedirectToClientRedirectUri).toHaveBeenCalledWith(
      redirectUri,
      undefined,
      state,
      undefined,
    );
  });

  it("includes code in redirect when provided", async () => {
    const redirectUri = "https://client.example.com/callback";
    const code = "auth-code-123";

    await redirectToClientRedirectUri(
      mockRequest,
      mockReply,
      redirectUri,
      undefined,
      undefined,
      code,
    );

    expect(mockGetRedirectToClientRedirectUri).toHaveBeenCalledWith(
      redirectUri,
      undefined,
      undefined,
      code,
    );
  });

  it("includes all parameters when provided", async () => {
    const redirectUri = "https://client.example.com/callback";
    const error = authorizeErrors.jwsInvalid;
    const state = "test-state";
    const code = "auth-code-123";

    await redirectToClientRedirectUri(
      mockRequest,
      mockReply,
      redirectUri,
      error,
      state,
      code,
    );

    expect(mockGetRedirectToClientRedirectUri).toHaveBeenCalledWith(
      redirectUri,
      error,
      state,
      code,
    );
  });
});
