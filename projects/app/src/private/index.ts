import { type FastifyInstance } from "fastify";

export const privateRoutes = function (app: FastifyInstance) {
  app.get("/private-healthcheck", async function (_request, reply) {
    return reply.send("ok");
  });
};
