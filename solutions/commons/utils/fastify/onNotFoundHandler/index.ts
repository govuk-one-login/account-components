import type { FastifyInstance } from "fastify";
import assert from "node:assert";

type NotFoundHandler = Parameters<FastifyInstance["setNotFoundHandler"]>[1];

export const onNotFound = async (
  _request: Parameters<NotFoundHandler>[0],
  reply: Parameters<NotFoundHandler>[1],
  pathToTemplate = "handlers/onNotFound/index.njk",
): Promise<ReturnType<NotFoundHandler>> => {
  reply.statusCode = 404;
  assert.ok(reply.render);
  await reply.render(pathToTemplate);
  return reply;
};
