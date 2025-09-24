import assert from "node:assert";
import { getEnvironment } from "../getEnvironment/index.js";
import fp from "fastify-plugin";

export const nunjucksRender = fp(function (app) {
  app.decorateReply("render", async function (templatePath, props = {}) {
    const { default: nunjucks } = await import("nunjucks");

    const env = nunjucks.configure(getEnvironment() === "local" ? "dist" : "", {
      autoescape: true,
      noCache: true,
    });

    assert.ok(this.i18next);
    env.addFilter("translate", this.i18next.t);

    const html = nunjucks.render(templatePath, props);
    this.type("text/html").send(html);
  });
});
