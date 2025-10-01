import type { FastifyTypeboxInstance } from "../../../commons/utils/fastify/types.js";
import { deleteAccount } from "./deleteAccount/index.js";

export const journeys = function (fastify: FastifyTypeboxInstance) {
  fastify.addHook("onRequest", () => {
    // TODO signed in check e.g.
    // if (not signed in) {
    //   redirect elsewhere
    // }
  });

  fastify.register(deleteAccount);
};
