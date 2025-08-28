import type { FastifyReply, FastifyRequest, FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

export const defaultCaching = fastifyPlugin(function (app: FastifyInstance) {
  app.addHook(
    "onRequest",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      reply.header("cache-control", "no-cache");
    },
  );
});
