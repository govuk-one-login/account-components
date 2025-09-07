import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { nunjucksRender } from "./index.js";
import { getEnvironment } from "../getEnvironment/index.js";
import type { FastifyInstance, FastifyReply } from "fastify";

vi.mock("../getEnvironment/index.js", () => ({
  getEnvironment: vi.fn(),
}));

const nunjucks = {
  configure: vi.fn(),
  render: vi.fn(),
};

vi.mock("nunjucks", () => ({
  default: nunjucks,
}));

describe("nunjucksRender", () => {
  let app: Partial<FastifyInstance>;
  let reply: Partial<FastifyReply>;

  beforeEach(() => {
    app = {
      decorateReply: vi.fn(),
    } as unknown as FastifyInstance;

    reply = {
      type: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("decorates reply with render function", async () => {
    nunjucksRender(app as FastifyInstance);

    expect(app.decorateReply).toHaveBeenCalledExactlyOnceWith(
      "render",
      expect.any(Function),
    );
  });

  it("configures nunjucks with 'dist' path when environment is local", async () => {
    vi.mocked(getEnvironment).mockReturnValue("local");

    nunjucksRender(app as FastifyInstance);
    const renderFunction = vi.mocked(app.decorateReply!).mock
      .calls[0]![1] as unknown as (...args: any) => Promise<void>;

    await renderFunction.call(reply, "template.html", { prop: "value" });

    expect(nunjucks.configure).toHaveBeenCalledExactlyOnceWith("dist", {
      autoescape: true,
      noCache: true,
    });
  });

  it("configures nunjucks with empty path when environment is not local", async () => {
    vi.mocked(getEnvironment).mockReturnValue("production");

    nunjucksRender(app as FastifyInstance);
    const renderFunction = vi.mocked(app.decorateReply!).mock
      .calls[0]![1] as unknown as (...args: any) => Promise<void>;

    await renderFunction.call(reply, "template.html", { prop: "value" });

    expect(nunjucks.configure).toHaveBeenCalledExactlyOnceWith("", {
      autoescape: true,
      noCache: true,
    });
  });

  it("renders template and sends HTML response", async () => {
    vi.mocked(getEnvironment).mockReturnValue("local");
    nunjucks.render.mockReturnValue("<html>rendered content</html>");

    nunjucksRender(app as FastifyInstance);
    const renderFunction = vi.mocked(app.decorateReply!).mock
      .calls[0]![1] as unknown as (...args: any) => Promise<void>;

    await renderFunction.call(reply, "template.html", { title: "Test" });

    expect(nunjucks.render).toHaveBeenCalledExactlyOnceWith("template.html", {
      title: "Test",
    });
    expect(reply.type).toHaveBeenCalledExactlyOnceWith("text/html");
    expect(reply.send).toHaveBeenCalledExactlyOnceWith(
      "<html>rendered content</html>",
    );
  });
});
