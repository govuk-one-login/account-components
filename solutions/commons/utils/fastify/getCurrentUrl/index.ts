import type { FastifyRequest } from "fastify";

export function getCurrentUrl(req: FastifyRequest): URL {
  return new URL(req.protocol + "://" + req.host + req.originalUrl);
}
