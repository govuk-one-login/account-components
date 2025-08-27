import { type FastifyInstance } from "fastify";

export const frontend = function (app: FastifyInstance) {
  app.register(async function (app) {
    const [
      fastifyCookieModule,
      fastifySessionModule,
      fastifyCsrfProtectionModule,
      fastifyHelmetModule,
    ] = await Promise.all([
      import("@fastify/cookie"),
      import("@fastify/session"),
      import("@fastify/csrf-protection"),
      import("@fastify/helmet"),
    ]);
    app.register(fastifyHelmetModule.default);
    app.register(fastifyCookieModule.default);
    app.register(fastifySessionModule.default, {
      secret: ["TODO a secret with minimum length of 32 characters!!!!!"],
      cookie: {
        secure: false, // TODO
      },
    });
    app.register(fastifyCsrfProtectionModule.default, {
      sessionPlugin: "@fastify/session",
    });

    app.decorateReply("render", async function (templatePath, variables) {
      const nunjucksModule = await import("nunjucks");

      nunjucksModule.default.configure({
        autoescape: true,
        noCache: true,
      });
      const html = nunjucksModule.default.render(templatePath, variables);
      this.type("text/html").send(html);
    });

    app.get("/html", async function (request, reply) {
      return (await import("./handlers/html/index.js")).html(request, reply);
    });
  });
};
