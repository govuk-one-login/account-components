import type { FastifyInstance } from "fastify";
import { deleteAccount } from "./deleteAccount/index.js";

export const journeys = function (fastify: FastifyInstance) {
  fastify.addHook("onRequest", () => {
    // TODO signed in check e.g.
    // if (not signed in) {
    //   redirect elsewhere
    // }
  });

  fastify.register(deleteAccount);
};
