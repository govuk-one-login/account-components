import { getEnvironment } from "../getEnvironment/index.js";
import fp from "fastify-plugin";

export const nunjucksRender = fp(function (app) {
  app.decorateReply("render", async function (templatePath, props) {
    const nunjucksModule = await import("nunjucks");

    nunjucksModule.default.configure(
      getEnvironment() === "local" ? "dist" : "",
      {
        autoescape: true,
        noCache: true,
      },
    );
    const html = nunjucksModule.default.render(templatePath, props);
    this.type("text/html").send(html);
  });
});
