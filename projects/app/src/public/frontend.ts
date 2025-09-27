import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import fastifyHelmet from "@fastify/helmet";
import fastifyCsrfProtection from "@fastify/csrf-protection";
import fastifyFormBody from "@fastify/formbody";
import { getEnvironment } from "../utils/getEnvironment/index.js";
import { nunjucksRender } from "../utils/nunjucksRender/index.js";
import type { FastifyTypeboxInstance } from "../app.js";
import { setUpI18n } from "../utils/setUpI18n/index.js";

export const frontend = function (app: FastifyTypeboxInstance) {
  app.register(fastifyFormBody);
  app.register(fastifyHelmet);
  app.register(fastifyCookie);
  app.register(fastifySession, {
    secret: [
      "TODO a secret with minimum length of 32 characters fron an env variable which is populated from a secret in secrets manager!!!!!",
    ],
    cookie: {
      secure: getEnvironment() !== "local",
      sameSite: "lax",
    },
  });
  app.register(fastifyCsrfProtection, {
    sessionPlugin: "@fastify/session",
  });
  app.register(nunjucksRender);
  app.register(setUpI18n);

  app.setNotFoundHandler(async function (request, reply) {
    const onNotFound = (await import("./handlers/frontend/onNotFound/index.js"))
      .onNotFound;
    return onNotFound.bind(this)(request, reply);
  });

  app.setErrorHandler(async function (error, request, reply) {
    const onError = (await import("./handlers/frontend/onError/index.js"))
      .onError;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return onError.bind(this)(error, request, reply);
  });
};
