import type { FastifyInstance } from "fastify";
import assert from "node:assert";

type NotFoundHandler = Parameters<FastifyInstance["setNotFoundHandler"]>[1];

export const onNotFound = async (
  reply: Parameters<NotFoundHandler>[1],
  pathToTemplate?: string,
): Promise<ReturnType<NotFoundHandler>> => {
  reply.statusCode = 404;
  assert.ok(reply.render);
  if (pathToTemplate) {
    await reply.render(pathToTemplate);
  } else {
    reply.send("Not found");
  }
  return reply;
};
