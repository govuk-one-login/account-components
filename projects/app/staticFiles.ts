import { type FastifyInstance } from "fastify";
import * as path from "node:path";
import fastifyStatic from "@fastify/static";

export const staticFiles = function (app: FastifyInstance) {
  app.register(fastifyStatic, {
    root: path.join(import.meta.dirname, "static", "cacheable"),
    prefix: "/static/cacheable/",
    maxAge: "1y",
    immutable: true,
  });
  app.register(fastifyStatic, {
    root: path.join(import.meta.dirname, "static"),
    prefix: "/static/",
    decorateReply: false,
    cacheControl: false,
  });
};
