import * as path from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyTypeboxInstance } from "../types.js";

export const staticFiles = function (fastify: FastifyTypeboxInstance) {
  const oneYearInSeconds = "31536000";

  fastify.register(fastifyStatic, {
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

  fastify.register(fastifyStatic, {
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

  fastify.register(fastifyStatic, {
    root: path.join(import.meta.dirname, "static"),
    prefix: "/",
    decorateReply: false,
    cacheControl: false,
    setHeaders: (res) => {
      res.setHeader("cache-control", "no-cache");
    },
  });
};
