import { resolveEnvVarToBool } from "../utils/resolveEnvVarToBool/index.js";
import type { FastifyTypeboxInstance } from "../app.js";
import { nunjucksRender } from "../utils/nunjucksRender/index.js";
import { setUpI18n } from "../utils/setUpI18n/index.js";
import fastifyCookie from "@fastify/cookie";

export const publicRoutes = async function (app: FastifyTypeboxInstance) {
  app.register(fastifyCookie);
  app.register(nunjucksRender);
  app.register(setUpI18n);

  app.setNotFoundHandler(async function (request, reply) {
    const onNotFound = (await import("./handlers/onNotFound/index.js"))
      .onNotFound;
    return onNotFound.bind(this)(request, reply);
  });

  app.setErrorHandler(async function (error, request, reply) {
    const onError = (await import("./handlers/onError/index.js")).onError;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return onError.bind(this)(error, request, reply);
  });

  if (resolveEnvVarToBool("REGISTER_PUBLIC_STUB_ROUTES")) {
    app.register(
      (await import("./externalEndpointStubs/index.js")).externalEndpointStubs,
      {
        prefix: "/stubs/external-endpoints",
      },
    );
  }

  if (resolveEnvVarToBool("REGISTER_PUBLIC_STATIC_ROUTES")) {
    app.register(
      async (app) => {
        (await import("./staticFiles/index.js")).staticFiles(app);
      },
      { prefix: "/static" },
    );
  }

  if (resolveEnvVarToBool("REGISTER_PUBLIC_FRONTEND_ROUTES")) {
    app.register(async (app) => {
      (await import("./frontend/index.js")).frontend(app);
    });
  }

  app.get("/healthcheck", async function (_request, reply) {
    return reply.send("ok");
  });

  app.get("/robots.txt", async function (request, reply) {
    return (await import("./handlers/robots.txt/index.js")).handler(
      request,
      reply,
    );
  });
};
