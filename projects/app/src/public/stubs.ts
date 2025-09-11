import { type FastifyInstance } from "fastify";

export const stubs = function (app: FastifyInstance) {
  app.get("/", async function (_request, reply) {
    return reply.send(
      "Temporary stub route. Remove once there are real stub routes.",
    );
  });
};
