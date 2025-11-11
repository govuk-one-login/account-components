import type { FastifyInstance } from "fastify";
import { deleteAccount } from "./deleteAccount/index.js";
import { onRequest } from "./utils/onRequest.js";

export const journeyRoutes = function (fastify: FastifyInstance) {
  fastify.addHook("onRequest", async (request, reply) => {
    await onRequest(request, reply);
  });

  fastify.addHook("onSend", () => {
    // TODO signed in check e.g.
    // if (not signed in) {
    //   redirect elsewhere
    // }
  });

  fastify.register(deleteAccount);
};
