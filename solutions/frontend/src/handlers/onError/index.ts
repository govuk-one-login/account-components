import assert from "node:assert";
import type { FastifyInstance } from "fastify";

type ErrorHandler = Parameters<FastifyInstance["setErrorHandler"]>[0];

export const onError = (
  error: Parameters<ErrorHandler>[0],
  request: Parameters<ErrorHandler>[1],
  reply: Parameters<ErrorHandler>[2],
): ReturnType<ErrorHandler> => {
  request.log.error(error, "An error occurred");
  reply.statusCode = 500;
  assert.ok(reply.render);
  return reply.render("handlers/onError/index.njk");
};
