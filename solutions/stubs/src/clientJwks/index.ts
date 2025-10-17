import { paths } from "../utils/paths.js";
import type { FastifyInstance } from "fastify";

export const clientJwks = function (app: FastifyInstance) {
  app.get(paths.clientJwks, async function (request, reply) {
    return (await import("./handlers/getJwks.js")).getJwks(request, reply);
  });
};
