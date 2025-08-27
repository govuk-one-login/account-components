import { type FastifyInstance } from "fastify";
import * as path from "node:path";

export const staticFiles = async function (app: FastifyInstance) {
  app.register((await import("@fastify/static")).default, {
    root: path.join(import.meta.dirname, "static", "cacheable"),
    prefix: "/static/cacheable/",
    maxAge: "1y",
    immutable: true,
  });
  app.register((await import("@fastify/static")).default, {
    root: path.join(import.meta.dirname, "static"),
    prefix: "/static/",
    decorateReply: false,
    cacheControl: false,
  });
};
