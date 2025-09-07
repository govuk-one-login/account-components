import type { FastifyReply } from "fastify";

export const addDefaultCaching = async (reply: FastifyReply) => {
  if (typeof reply.getHeader("cache-control") === "undefined") {
    reply.header("cache-control", "no-cache");
  }
};
