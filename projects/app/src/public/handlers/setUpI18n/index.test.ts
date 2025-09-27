import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setUpI18n } from "./index.js";
import type { FastifyTypeboxInstance } from "../../../app.js";
import { Lang } from "../../../app.js";
import type { FastifyRequest, FastifyReply } from "fastify";
import en from "../../../translations/en.json" with { type: "json" };
import cy from "../../../translations/cy.json" with { type: "json" };

vi.mock("i18next", () => ({
  default: {
    init: vi.fn(),
  },
}));

describe("setUpI18n", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockRequest = {
      query: {},
      cookies: {},
    };

    mockReply = {};
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should set English as default language when no lng parameter or cookie", async () => {
    await setUpI18n.call(
      {} as FastifyTypeboxInstance,
      mockRequest as Parameters<typeof setUpI18n>[0],
      mockReply as Parameters<typeof setUpI18n>[1],
    );

    expect(mockRequest.lang).toBe(Lang.English);
  });

  it("should set language from query parameter", async () => {
    mockRequest.query = { lng: "cy" };

    await setUpI18n.call(
      {} as FastifyTypeboxInstance,
      mockRequest as Parameters<typeof setUpI18n>[0],
      mockReply as Parameters<typeof setUpI18n>[1],
    );

    expect(mockRequest.lang).toBe(Lang.Welsh);
  });

  it("should set language from cookie when no query parameter", async () => {
    mockRequest.cookies = { lng: "cy" };

    await setUpI18n.call(
      {} as FastifyTypeboxInstance,
      mockRequest as Parameters<typeof setUpI18n>[0],
      mockReply as Parameters<typeof setUpI18n>[1],
    );

    expect(mockRequest.lang).toBe(Lang.Welsh);
  });

  it("should prioritize query parameter over cookie", async () => {
    mockRequest.query = { lng: "en" };
    mockRequest.cookies = { lng: "cy" };

    await setUpI18n.call(
      {} as FastifyTypeboxInstance,
      mockRequest as Parameters<typeof setUpI18n>[0],
      mockReply as Parameters<typeof setUpI18n>[1],
    );

    expect(mockRequest.lang).toBe(Lang.English);
  });

  it("should fallback to English for invalid language values", async () => {
    mockRequest.query = { lng: "invalid" };

    await setUpI18n.call(
      {} as FastifyTypeboxInstance,
      mockRequest as Parameters<typeof setUpI18n>[0],
      mockReply as Parameters<typeof setUpI18n>[1],
    );

    expect(mockRequest.lang).toBe(Lang.English);
  });

  it("should initialize i18next with correct configuration", async () => {
    const { default: i18next } = await import("i18next");
    mockRequest.query = { lng: "cy" };

    await setUpI18n.call(
      {} as FastifyTypeboxInstance,
      mockRequest as Parameters<typeof setUpI18n>[0],
      mockReply as Parameters<typeof setUpI18n>[1],
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(i18next.init).toHaveBeenCalledWith({
      lng: Lang.Welsh,
      fallbackLng: Lang.English,
      resources: {
        [Lang.English]: {
          translation: en,
        },
        [Lang.Welsh]: {
          translation: cy,
        },
      },
    });
  });

  it("should attach i18next instance to reply", async () => {
    const { default: i18next } = await import("i18next");

    await setUpI18n.call(
      {} as FastifyTypeboxInstance,
      mockRequest as Parameters<typeof setUpI18n>[0],
      mockReply as Parameters<typeof setUpI18n>[1],
    );

    expect(mockReply.i18next).toBe(i18next);
  });
});
