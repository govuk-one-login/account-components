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
    secret: ["TODO a secret with minimum length of 32 characters!!!!!"],
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
};
