import { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import fastifyHelmet from "@fastify/helmet";
import fastifyCsrfProtection from "@fastify/csrf-protection";
import fastifyFormBody from "@fastify/formbody";
import { environment } from "./utils/environment/index.js";

export const frontend = function (app: FastifyInstance) {
  app.register(fastifyFormBody);
  app.register(fastifyHelmet);
  app.register(fastifyCookie);
  app.register(fastifySession, {
    secret: ["TODO a secret with minimum length of 32 characters!!!!!"],
    cookie: {
      secure: environment !== "local",
      sameSite: "lax",
    },
  });
  app.register(fastifyCsrfProtection, {
    sessionPlugin: "@fastify/session",
  });

  app.decorateReply("render", async function (templatePath, props) {
    const nunjucksModule = await import("nunjucks");

    nunjucksModule.default.configure({
      autoescape: true,
      noCache: true,
    });
    const html = nunjucksModule.default.render(templatePath, props);
    this.type("text/html").send(html);
  });

  app.get("/robots.txt", async function (request, reply) {
    return (await import("./handlers/robots.txt/index.js")).handler(
      request,
      reply,
    );
  });

  app.get("/html", async function (request, reply) {
    return (await import("./handlers/html/index.js")).html(request, reply);
  });
};
