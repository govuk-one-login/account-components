import { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import fastifyHelmet from "@fastify/helmet";
import fastifyCsrfProtection from "@fastify/csrf-protection";

export const frontend = function (app: FastifyInstance) {
  app.register(fastifyHelmet);
  app.register(fastifyCookie);
  app.register(fastifySession, {
    secret: ["TODO a secret with minimum length of 32 characters!!!!!"],
    cookie: {
      secure: true,
    },
  });
  app.register(fastifyCsrfProtection, {
    sessionPlugin: "@fastify/session",
  });

  //app.decorateReply("renderProps", {});
  app.decorateReply("render", async function (templatePath, renderProps) {
    const nunjucksModule = await import("nunjucks");

    nunjucksModule.default.configure({
      autoescape: true,
      noCache: true,
    });
    const html = nunjucksModule.default.render(templatePath, {
      ...this.renderProps,
      ...renderProps,
    });
    this.type("text/html").send(html);
  });

  app.get("/robots.txt", async function (request, reply) {
    return (await import("./handlers/robots.txt/index.js")).handler(
      request,
      reply
    );
  });

  app.get("/html", async function (request, reply) {
    return (await import("./handlers/html/index.js")).html(request, reply);
  });
};
