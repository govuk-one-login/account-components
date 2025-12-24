import type { FastifyInstance } from "fastify";
import { testingJourney } from "./testing-journey/index.js";
import { accountDelete } from "./account-delete/index.js";
import { onRequest } from "./utils/onRequest.js";
import { onSend } from "./utils/onSend.js";
import { goToClientRedirectUriGet } from "./goToClientRedirectUri/handler.js";
import { paths } from "../utils/paths.js";

export const journeyRoutes = function (fastify: FastifyInstance) {
  fastify.addHook("onRequest", async (request, reply) => {
    await onRequest(request, reply);
  });

  fastify.addHook("onSend", async (request, reply) => {
    await onSend(request, reply);
  });

  fastify.get(
    paths.journeys.others.goToClientRedirectUri.path,
    goToClientRedirectUriGet,
  );
  fastify.register(testingJourney);
  fastify.register(accountDelete);
};
