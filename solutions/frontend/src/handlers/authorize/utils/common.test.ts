import { describe, it, expect, vi } from "vitest";
import { authorizeErrors } from "../../../utils/authorizeErrors.js";
import { getRedirectToClientRedirectUriResponse } from "./common.js";
import type { FastifyReply } from "fastify";

describe("getRedirectToClientRedirectUriResponse", () => {
  it("redirects with code parameter", () => {
    const reply = {
      redirect: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    getRedirectToClientRedirectUriResponse(
      reply,
      "https://example.com/callback",
      undefined,
      undefined,
      "auth-code-123",
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.redirect).toHaveBeenCalledWith(
      "https://example.com/callback?code=auth-code-123",
    );
  });

  it("redirects with error parameters", () => {
    const reply = {
      redirect: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    getRedirectToClientRedirectUriResponse(
      reply,
      "https://example.com/callback",
      authorizeErrors.jwtExpired,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.redirect).toHaveBeenCalledWith(
      "https://example.com/callback?error=invalid_request&error_description=E1005",
    );
  });

  it("redirects with state parameter", () => {
    const reply = {
      redirect: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    getRedirectToClientRedirectUriResponse(
      reply,
      "https://example.com/callback",
      undefined,
      "state-123",
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.redirect).toHaveBeenCalledWith(
      "https://example.com/callback?state=state-123",
    );
  });

  it("redirects with error and state parameters", () => {
    const reply = {
      redirect: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    getRedirectToClientRedirectUriResponse(
      reply,
      "https://example.com/callback",
      authorizeErrors.verifyJwtUnknownError,
      "state-456",
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.redirect).toHaveBeenCalledWith(
      "https://example.com/callback?error=server_error&error_description=E3002&state=state-456",
    );
  });

  it("redirects with code and state parameters", () => {
    const reply = {
      redirect: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    getRedirectToClientRedirectUriResponse(
      reply,
      "https://example.com/callback",
      undefined,
      "state-789",
      "auth-code-456",
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.redirect).toHaveBeenCalledWith(
      "https://example.com/callback?code=auth-code-456&state=state-789",
    );
  });

  it("redirects with only redirect URI when no optional parameters provided", () => {
    const reply = {
      redirect: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    getRedirectToClientRedirectUriResponse(
      reply,
      "https://example.com/callback",
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.redirect).toHaveBeenCalledWith("https://example.com/callback");
  });
});
