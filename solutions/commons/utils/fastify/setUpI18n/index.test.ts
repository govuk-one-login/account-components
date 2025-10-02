import { beforeEach, describe, expect, it, vi } from "vitest";
import i18next from "i18next";
import { setUpI18n, Lang } from "./index.js";
import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";

vi.mock("i18next", () => ({
  default: {
    init: vi.fn(),
  },
}));

describe("setUpI18n", () => {
  let request: Partial<FastifyRequest>;
  let reply: Partial<FastifyReply>;
  let translations: { [Lang.English]: object; [Lang.Welsh]: object };

  beforeEach(() => {
    request = {
      query: {},
      cookies: {},
    };
    reply = {};
    translations = {
      [Lang.English]: { hello: "Hello" },
      [Lang.Welsh]: { hello: "Helo" },
    };
    vi.clearAllMocks();
  });

  it("should set language to English by default", async () => {
    const handler = setUpI18n(translations);
    await handler.call(
      {} as FastifyInstance,
      request as Parameters<typeof handler>[0],
      reply as Parameters<typeof handler>[1],
    );

    expect(request.lang).toBe(Lang.English);
  });

  it("should set language from query parameter", async () => {
    request.query = { lng: Lang.Welsh };
    const handler = setUpI18n(translations);
    await handler.call(
      {} as FastifyInstance,
      request as Parameters<typeof handler>[0],
      reply as Parameters<typeof handler>[1],
    );

    expect(request.lang).toBe(Lang.Welsh);
  });

  it("should set language from cookie", async () => {
    request.cookies = { lng: Lang.Welsh };
    const handler = setUpI18n(translations);
    await handler.call(
      {} as FastifyInstance,
      request as Parameters<typeof handler>[0],
      reply as Parameters<typeof handler>[1],
    );

    expect(request.lang).toBe(Lang.Welsh);
  });

  it("should prioritize query parameter over cookie", async () => {
    request.query = { lng: Lang.English };
    request.cookies = { lng: Lang.Welsh };
    const handler = setUpI18n(translations);
    await handler.call(
      {} as FastifyInstance,
      request as Parameters<typeof handler>[0],
      reply as Parameters<typeof handler>[1],
    );

    expect(request.lang).toBe(Lang.English);
  });

  it("should fallback to English for invalid language", async () => {
    request.query = { lng: "invalid" };
    const handler = setUpI18n(translations);
    await handler.call(
      {} as FastifyInstance,
      request as Parameters<typeof handler>[0],
      reply as Parameters<typeof handler>[1],
    );

    expect(request.lang).toBe(Lang.English);
  });

  it("should initialize i18next with correct configuration", async () => {
    request.query = { lng: Lang.Welsh };
    const handler = setUpI18n(translations);
    await handler.call(
      {} as FastifyInstance,
      request as Parameters<typeof handler>[0],
      reply as Parameters<typeof handler>[1],
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(i18next.init).toHaveBeenCalledWith({
      lng: Lang.Welsh,
      fallbackLng: Lang.English,
      resources: {
        [Lang.English]: {
          translation: translations[Lang.English],
        },
        [Lang.Welsh]: {
          translation: translations[Lang.Welsh],
        },
      },
    });
  });

  it("should set i18next instance on reply", async () => {
    const handler = setUpI18n(translations);
    await handler.call(
      {} as FastifyInstance,
      request as Parameters<typeof handler>[0],
      reply as Parameters<typeof handler>[1],
    );

    expect(reply.i18next).toBe(i18next);
  });
});
