import { paths } from "../utils/paths.js";
import type { FastifyInstance } from "fastify";

export const generateRequestObject = function (app: FastifyInstance) {
  app.post(paths.requestObjectGenerator, async function (request, reply) {
    return (await import("./handlers/post.js")).generateRequestObjectPost(
      request,
      reply,
    );
  });
};
