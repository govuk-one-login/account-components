import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { render } from "./index.js";
import { getEnvironment } from "../../../utils/getEnvironment/index.js";
import type { FastifyReply } from "fastify";
import type i18next from "i18next";
import assert from "node:assert";

vi.mock("../../../utils/getEnvironment/index.js", () => ({
  getEnvironment: vi.fn(),
}));

const mockEnv = {
  addFilter: vi.fn(),
  addGlobal: vi.fn(),
};

const nunjucks = {
  configure: vi.fn().mockReturnValue(mockEnv),
  render: vi.fn(),
};

vi.mock("nunjucks", () => ({
  default: nunjucks,
}));

describe("render", () => {
  let reply: Partial<FastifyReply>;

  beforeEach(() => {
    reply = {
      type: vi.fn().mockReturnThis(),
      send: vi.fn(),
      i18next: {
        t: vi.fn(),
      } as unknown as typeof i18next,
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
    });

    assert.ok(reply.i18next?.t);

    expect(mockEnv.addFilter).toHaveBeenCalledExactlyOnceWith(
      "translate",
      reply.i18next.t,
    );
    expect(nunjucks.render).toHaveBeenCalledExactlyOnceWith("template.html", {
      title: "Test",
    });
    expect(reply.type).toHaveBeenCalledExactlyOnceWith("text/html");
    expect(reply.send).toHaveBeenCalledExactlyOnceWith(
      "<html>rendered content</html>",
    );
  });
});
