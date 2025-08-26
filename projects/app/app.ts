import { type FastifyPluginOptions, type FastifyInstance } from "fastify";
import * as path from "node:path";

declare module "fastify" {
  interface FastifyReply {
    render?: (
      templatePath: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variables: Record<string, any>,
    ) => Promise<void>;
  }
}

declare module "fastify" {
  interface Session {
    example?: string;
  }
}

const initApp = async function (
  fastify?: FastifyInstance,
  // @ts-expect-error  - it is necessary to include this argument even though it isn't used as otherwise the command to generate OpenAPI documents errors saying that the function should have two arguments
  opts?: FastifyPluginOptions, // eslint-disable-line
) {
  const isGeneratingOpenApiDocs = !!fastify;
  const app = fastify ?? (await import("fastify")).default();

  // OpenAPI docs
  if (isGeneratingOpenApiDocs) {
    app.register((await import("@fastify/swagger")).default, {
      openapi: {},
    });
  }

  // Static files
  app.register((await import("@fastify/static")).default, {
    root: path.join(import.meta.dirname, "static", "cacheable"),
    prefix: "/static/cacheable/",
    maxAge: "1y",
    immutable: true,
  });
  app.register((await import("@fastify/static")).default, {
    root: path.join(import.meta.dirname, "static"),
    prefix: "/static/",
    decorateReply: false,
  });

  // Frontend
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

  // API
  app.register(
    function (app) {
      app.get(
        "/hello",
        {
          schema: {
            querystring: {
              type: "object",
              properties: {
                foo: { type: "number" },
                bar: { type: "string" },
              },
              required: ["foo", "bar"],
            },
            response: {
              200: {
                type: "object",
                properties: {
                  hello: { type: "string" },
                },
              },
            },
          },
        },
        async function (request, reply) {
          (await import("./handlers/api/hello/index.js")).hello(request, reply);
        },
      );
    },
    {
      prefix: "/api/",
    },
  );

  return app;
};

// eslint-disable-next-line
export default initApp;
