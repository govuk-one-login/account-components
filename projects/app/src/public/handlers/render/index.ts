import assert from "node:assert";
import { getEnvironment } from "../../../utils/getEnvironment/index.js";
import type { FastifyReply } from "fastify";
import { addLanguageParam, contactUsUrl } from "@govuk-one-login/frontend-ui";
import * as path from "node:path";

export const render = async function (
  this: FastifyReply,
  templatePath: string,
  props = {},
) {
  const { default: nunjucks } = await import("nunjucks");
  const nunjucksPath = getEnvironment() === "local" ? "dist" : "";
  const env = nunjucks.configure(
    [
      nunjucksPath,
      path.join(nunjucksPath, "node_modules/govuk-frontend/dist"),
      path.join(nunjucksPath, "node_modules/@govuk-one-login"),
    ],
    {
      autoescape: true,
      noCache: true,
    },
  );

  assert.ok(this.i18next);
  env.addFilter("translate", this.i18next.t);
  env.addGlobal("govukRebrand", true);

  env.addGlobal("addLanguageParam", addLanguageParam);
  env.addGlobal("contactUsUrl", contactUsUrl);

  const html = nunjucks.render(templatePath, props);
  this.type("text/html").send(html);
};
