import { type FastifyInstance } from "fastify";

export const miscellaneous = function (app: FastifyInstance) {
  app.get("/robots.txt", async function (request, reply) {
    return (await import("./handlers/robots.txt/index.js")).handler(
      request,
      reply,
    );
  });
};
