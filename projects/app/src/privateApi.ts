import { type FastifyInstance } from "fastify";

export const privateApi = function (app: FastifyInstance) {
  app.register(
    function (app) {
      app.get("/", async function (request, reply) {
        request.log.info(
          "Dummy private API route. TODO remove this route once we have real private API routes",
        );
        return reply.send(
          "Dummy private API route. TODO remove this route once we have real private API routes",
        );
      });
    },
    {
      prefix: "/private-api",
    },
  );
};
