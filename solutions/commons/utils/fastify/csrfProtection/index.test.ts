import { beforeEach, describe, expect, it, vi } from "vitest";
import { csrfProtection } from "./index.js";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

describe("csrfProtection", () => {
  let fastify: Partial<FastifyInstance>;
  let request: Partial<FastifyRequest>;
  let reply: Partial<FastifyReply>;
  let done: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    done = vi.fn();
    fastify = {
      register: vi.fn(),
      addHook: vi.fn(),
      csrfProtection: vi.fn(),
    };
    request = {
      method: "GET",
      body: {},
    };
    reply = {
      // @ts-expect-error
      globals: {},
      generateCsrf: vi.fn().mockReturnValue("csrf-token-123"),
    };
  });

  it("should register fastify-csrf-protection with correct OPTIONS", async () => {
    await csrfProtection(fastify as FastifyInstance);

    expect(fastify.register).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      expect.objectContaining({
        sessionPlugin: "@fastify/session",
        getToken: expect.any(Function),
      }),
    );
  });

  it("should extract CSRF token from request body", async () => {
    await csrfProtection(fastify as FastifyInstance);

    const registerCall = vi.mocked(fastify.register!).mock.calls[0];
    const OPTIONS = registerCall![1] as {
      getToken: (req: FastifyRequest) => string | undefined;
    };

    request.body = { _csrf: "token-from-body" };
    const token = OPTIONS.getToken(request as FastifyRequest);

    expect(token).toBe("token-from-body");
  });

  it("should return undefined when CSRF token is missing from body", async () => {
    await csrfProtection(fastify as FastifyInstance);

    const registerCall = vi.mocked(fastify.register!).mock.calls[0];
    const OPTIONS = registerCall![1] as {
      getToken: (req: FastifyRequest) => string | undefined;
    };

    request.body = {};
    const token = OPTIONS.getToken(request as FastifyRequest);

    expect(token).toBeUndefined();
  });

  it("should return undefined when body is invalid", async () => {
    await csrfProtection(fastify as FastifyInstance);

    const registerCall = vi.mocked(fastify.register!).mock.calls[0];
    const OPTIONS = registerCall![1] as {
      getToken: (req: FastifyRequest) => string | undefined;
    };

    request.body = "invalid-body";
    const token = OPTIONS.getToken(request as FastifyRequest);

    expect(token).toBeUndefined();
  });

  it("should add preHandler hook", async () => {
    await csrfProtection(fastify as FastifyInstance);

    expect(fastify.addHook).toHaveBeenCalledExactlyOnceWith(
      "preHandler",
      expect.any(Function),
    );
  });

  it("should generate CSRF token and skip protection for GET requests", async () => {
    await csrfProtection(fastify as FastifyInstance);

    const hookCall = vi.mocked(fastify.addHook!).mock.calls[0];
    const preHandler = hookCall![1] as (
      req: FastifyRequest,
      reply: FastifyReply,
      done: () => void,
    ) => void;

    // @ts-expect-error
    request.method = "GET";
    preHandler(request as FastifyRequest, reply as FastifyReply, done);

    expect(reply.globals!.csrfToken).toBe("csrf-token-123");
    expect(fastify.csrfProtection).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledExactlyOnceWith();
  });

  it("should generate CSRF token and skip protection for HEAD requests", async () => {
    await csrfProtection(fastify as FastifyInstance);

    const hookCall = vi.mocked(fastify.addHook!).mock.calls[0];
    const preHandler = hookCall![1] as (
      req: FastifyRequest,
      reply: FastifyReply,
      done: () => void,
    ) => void;

    // @ts-expect-error
    request.method = "HEAD";
    preHandler(request as FastifyRequest, reply as FastifyReply, done);

    expect(reply.globals!.csrfToken).toBe("csrf-token-123");
    expect(fastify.csrfProtection).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledExactlyOnceWith();
  });

  it("should generate CSRF token and skip protection for OPTIONS requests", async () => {
    await csrfProtection(fastify as FastifyInstance);

    const hookCall = vi.mocked(fastify.addHook!).mock.calls[0];
    const preHandler = hookCall![1] as (
      req: FastifyRequest,
      reply: FastifyReply,
      done: () => void,
    ) => void;

    // @ts-expect-error
    request.method = "OPTIONS";
    preHandler(request as FastifyRequest, reply as FastifyReply, done);

    expect(reply.globals!.csrfToken).toBe("csrf-token-123");
    expect(fastify.csrfProtection).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledExactlyOnceWith();
  });

  it("should generate CSRF token and apply protection for POST requests", async () => {
    await csrfProtection(fastify as FastifyInstance);

    const hookCall = vi.mocked(fastify.addHook!).mock.calls[0];
    const preHandler = hookCall![1] as (
      req: FastifyRequest,
      reply: FastifyReply,
      done: () => void,
    ) => void;

    // @ts-expect-error
    request.method = "POST";
    preHandler(request as FastifyRequest, reply as FastifyReply, done);

    expect(reply.globals!.csrfToken).toBe("csrf-token-123");
    expect(fastify.csrfProtection).toHaveBeenCalledExactlyOnceWith(
      request,
      reply,
      done,
    );
  });

  it("should generate CSRF token and apply protection for PUT requests", async () => {
    await csrfProtection(fastify as FastifyInstance);

    const hookCall = vi.mocked(fastify.addHook!).mock.calls[0];
    const preHandler = hookCall![1] as (
      req: FastifyRequest,
      reply: FastifyReply,
      done: () => void,
    ) => void;

    // @ts-expect-error
    request.method = "PUT";
    preHandler(request as FastifyRequest, reply as FastifyReply, done);

    expect(reply.globals!.csrfToken).toBe("csrf-token-123");
    expect(fastify.csrfProtection).toHaveBeenCalledExactlyOnceWith(
      request,
      reply,
      done,
    );
  });

  it("should generate CSRF token and apply protection for DELETE requests", async () => {
    await csrfProtection(fastify as FastifyInstance);

    const hookCall = vi.mocked(fastify.addHook!).mock.calls[0];
    const preHandler = hookCall![1] as (
      req: FastifyRequest,
      reply: FastifyReply,
      done: () => void,
    ) => void;

    // @ts-expect-error
    request.method = "DELETE";
    preHandler(request as FastifyRequest, reply as FastifyReply, done);

    expect(reply.globals!.csrfToken).toBe("csrf-token-123");
    expect(fastify.csrfProtection).toHaveBeenCalledExactlyOnceWith(
      request,
      reply,
      done,
    );
  });
});
