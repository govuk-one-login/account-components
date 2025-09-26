import fastifySession from "@fastify/session";
import fastifyHelmet from "@fastify/helmet";
import fastifyCsrfProtection from "@fastify/csrf-protection";
import fastifyFormBody from "@fastify/formbody";
import { getEnvironment } from "../../utils/getEnvironment/index.js";
import type { FastifyTypeboxInstance } from "../../app.js";
import { journeys } from "./journeys/index.js";

export const frontend = function (app: FastifyTypeboxInstance) {
  app.register(fastifyFormBody);
  app.register(fastifyHelmet);
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

  app.register(journeys);
};
