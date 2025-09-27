import assert from "node:assert";
import type { FastifyTypeboxInstance } from "../../../../app.js";

type ErrorHandler = Parameters<FastifyTypeboxInstance["setErrorHandler"]>[0];

export const onError = (
  error: Parameters<ErrorHandler>[0],
  request: Parameters<ErrorHandler>[1],
  reply: Parameters<ErrorHandler>[2],
): ReturnType<ErrorHandler> => {
  request.log.error(error, "A frontend error occurred");
  reply.statusCode = 500;
  assert.ok(reply.render);
  return reply.render("public/handlers/frontend/onError/index.njk");
};
