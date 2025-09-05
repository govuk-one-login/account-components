import { type FastifyInstance } from "fastify";

export const stubs = function (app: FastifyInstance) {
  app.register(
    function (app) {
      app.get("/", async function (request, reply) {
        request.log.info(
          "Dummy stub route. TODO remove this route once we have real stub routes",
        );
        return reply.send(
          "Dummy stub route. TODO remove this route once we have real stub routes",
        );
      });
    },
    {
      prefix: "/stub/",
    },
  );
};
