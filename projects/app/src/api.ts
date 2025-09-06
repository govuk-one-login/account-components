import { type FastifyInstance } from "fastify";

export const api = function (app: FastifyInstance) {
  app.get("/healthcheck", async function (_request, reply) {
    return reply.send("ok");
  });
};
