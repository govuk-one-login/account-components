import { getEnvironment } from "../../getEnvironment/index.js";
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

  if (this.i18next) {
    env.addFilter("translate", this.i18next.t);
  }

  const html = nunjucks.render(templatePath, props);
  this.type("text/html").send(html);
};
