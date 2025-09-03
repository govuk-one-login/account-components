import type { FastifyReply, FastifyRequest, FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

export const defaultCaching = fastifyPlugin(function (app: FastifyInstance) {
  app.addHook(
    "onSend",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      if (typeof reply.getHeader("cache-control") === "undefined") {
        reply.header("cache-control", "no-cache");
      }
    },
  );
});
