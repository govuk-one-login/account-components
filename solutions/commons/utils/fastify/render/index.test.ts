import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { render } from "./index.js";
import { getEnvironment } from "../../getEnvironment/index.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import type i18next from "i18next";

vi.mock(import("../../getEnvironment/index.js"), () => ({
  getEnvironment: vi.fn(),
}));

vi.mock(import("../getCurrentUrl/index.js"), () => ({
  getCurrentUrl: vi.fn().mockReturnValue(new URL("http://example.com/current")),
}));

const mockEnv = {
  addFilter: vi.fn(),
  addGlobal: vi.fn(),
};

const nunjucks = {
  configure: vi.fn().mockReturnValue(mockEnv),
  render: vi.fn(),
};

// @ts-expect-error
vi.mock(import("nunjucks"), () => ({
  default: nunjucks,
}));

describe("render", () => {
  let reply: Partial<FastifyReply>;

  beforeEach(() => {
    reply = {
      type: vi.fn().mockReturnThis(),
      send: vi.fn(),
      request: {
        i18n: {
          t: vi.fn(),
        } as unknown as typeof i18next,
      } as FastifyRequest,
      cspNonce: {
        script: "cspNonce",
        style: "styleNonce",
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("configures nunjucks with 'dist' path when environment is local", async () => {
    vi.mocked(getEnvironment).mockReturnValue("local");

    await render.call(reply as FastifyReply, "template.html", {
      prop: "value",
    });

    expect(nunjucks.configure).toHaveBeenCalledExactlyOnceWith(
      [
        "dist",
        "dist/node_modules/govuk-frontend/dist",
        "dist/node_modules/@govuk-one-login",
      ],
      {
        autoescape: true,
        noCache: true,
      },
    );
  });

  it("configures nunjucks with empty path when environment is not local", async () => {
    vi.mocked(getEnvironment).mockReturnValue("production");

    await render.call(reply as FastifyReply, "template.html", {
      prop: "value",
    });

    expect(nunjucks.configure).toHaveBeenCalledExactlyOnceWith(
      ["", "node_modules/govuk-frontend/dist", "node_modules/@govuk-one-login"],
      {
        autoescape: true,
        noCache: true,
      },
    );
  });

  it("renders template and sends HTML response", async () => {
    vi.mocked(getEnvironment).mockReturnValue("local");

    nunjucks.render.mockReturnValue("<html>rendered content</html>");

    await render.call(reply as FastifyReply, "template.html", {
      title: "Test",
      currentUrl: new URL("http://example.com/current"),
      htmlLang: "en",
    });

    expect(mockEnv.addFilter).toHaveBeenCalledWith(
      "translate",
      reply.request?.i18n.t,
    );
    expect(mockEnv.addGlobal).toHaveBeenCalledWith("reply", reply);
    expect(nunjucks.render).toHaveBeenCalledExactlyOnceWith("template.html", {
      currentUrl: new URL("http://example.com/current"),
      htmlLang: "en",
      title: "Test",
    });
    expect(reply.type).toHaveBeenCalledExactlyOnceWith("text/html");
    expect(reply.send).toHaveBeenCalledExactlyOnceWith(
      "<html>rendered content</html>",
    );
  });
});
