import assert from "node:assert";
import type { FastifyTypeboxInstance } from "../../frontend.js";

type NotFoundHandler = Parameters<
  FastifyTypeboxInstance["setNotFoundHandler"]
>[1];

export const onNotFound = (
  _request: Parameters<NotFoundHandler>[0],
  reply: Parameters<NotFoundHandler>[1],
): ReturnType<NotFoundHandler> => {
  reply.statusCode = 404;
  assert.ok(reply.render);
  return reply.render("handlers/onNotFound/index.njk");
};
