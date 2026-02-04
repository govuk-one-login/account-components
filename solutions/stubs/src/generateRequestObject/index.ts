import { paths } from "../utils/paths.js";
import type { FastifyInstance } from "fastify";

export const generateRequestObject = function (app: FastifyInstance) {
  app.post(paths.requestObjectGenerator, async function (request, reply) {
    return (await import("./handlers/post.js")).generateRequestObjectPost(
      request,
      reply,
    );
  });
  app.get(paths.requestObjectCreator, async function (request, reply) {
    return (await import("./handlers/create.js")).createRequestObjectGet(
      request,
      reply,
    );
  });
  app.post(paths.requestObjectCreator, async function (request, reply) {
    const handler = (
      await import("./handlers/create.js")
    ).createRequestObjectPost(app);
    return handler(request, reply);
  });
};
