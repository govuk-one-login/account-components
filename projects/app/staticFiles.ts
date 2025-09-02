import { type FastifyInstance } from "fastify";
import * as path from "node:path";
import fastifyStatic from "@fastify/static";

export const staticFiles = function (app: FastifyInstance) {
  const oneYearInSeconds = "31536000";

  app.register(fastifyStatic, {
    root: path.join(import.meta.dirname, "static", "full-cache"),
    prefix: "/static/full-cache/",
    cacheControl: false,
    setHeaders: (res) => {
      res.setHeader(
        "cache-control",
        `public, max-age=${oneYearInSeconds}, immutable`,
      );
    },
  });

  app.register(fastifyStatic, {
    root: path.join(import.meta.dirname, "static", "shared-cache"),
    prefix: "/static/shared-cache/",
    decorateReply: false,
    cacheControl: false,
    setHeaders: (res) => {
      res.setHeader(
        "cache-control",
        `public, s-maxage=${oneYearInSeconds}, immutable`,
      );
    },
  });

  app.register(fastifyStatic, {
    root: path.join(import.meta.dirname, "static"),
    prefix: "/static/",
    decorateReply: false,
    cacheControl: false,
    setHeaders: (res) => {
      res.setHeader("cache-control", "no-cache");
    },
  });
};
