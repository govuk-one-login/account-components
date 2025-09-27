import assert from "node:assert";
import { getEnvironment } from "../../../utils/getEnvironment/index.js";
import type { FastifyReply } from "fastify";

export const render = async function (
  this: FastifyReply,
  templatePath: string,
  props = {},
) {
  const { default: nunjucks } = await import("nunjucks");

  const env = nunjucks.configure(getEnvironment() === "local" ? "dist" : "", {
    autoescape: true,
    noCache: true,
  });

  assert.ok(this.i18next);
  env.addFilter("translate", this.i18next.t);

  const html = nunjucks.render(templatePath, props);
  this.type("text/html").send(html);
};
