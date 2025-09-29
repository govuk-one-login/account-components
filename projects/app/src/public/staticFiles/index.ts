import * as path from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyTypeboxInstance } from "../../app.js";

export const staticFiles = function (app: FastifyTypeboxInstance) {
  const oneYearInSeconds = "31536000";

  app.register(fastifyStatic, {
    root: path.join(import.meta.dirname, "static", "full-cache"),
    prefix: "/full-cache",
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
    prefix: "/shared-cache",
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
    prefix: "/",
    decorateReply: false,
    cacheControl: false,
    setHeaders: (res) => {
      res.setHeader("cache-control", "no-cache");
    },
  });
};
