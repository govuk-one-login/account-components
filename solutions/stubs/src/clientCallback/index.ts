import { paths } from "../utils/paths.js";
import type { FastifyInstance } from "fastify";

export const clientCallback = function (app: FastifyInstance) {
  app.get(paths.clientCallback, async function (request, reply) {
    return (await import("./handlers/clientCallback.js")).handler(
      request,
      reply,
    );
  });
};
