import { getEnvironment } from "../../getEnvironment/index.js";
import type { FastifyReply } from "fastify";
import { addLanguageParam, contactUsUrl } from "@govuk-one-login/frontend-ui";
import * as path from "node:path";
import { getQueryParamsFromUrl } from "../../getQueryParamsFromUrl/index.js";
import { authorizeErrors } from "../../authorize/authorizeErrors.js";

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

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (this.request.i18n) {
    env.addFilter("translate", this.request.i18n.t);
  }
  env.addGlobal("cspNonce", this.cspNonce.script);
  env.addGlobal("styleNonce", this.cspNonce.style);
  env.addGlobal("globals", this.globals);

  // Required by templates in external packages
  env.addGlobal("govukRebrand", true);
  env.addGlobal("addLanguageParam", addLanguageParam);
  env.addGlobal("contactUsUrl", contactUsUrl);

  env.addFilter("getQueryParamsFromUrl", getQueryParamsFromUrl);
  env.addGlobal("authorizeErrors", authorizeErrors);

  const html = nunjucks.render(templatePath, props);
  this.type("text/html").send(html);
};
