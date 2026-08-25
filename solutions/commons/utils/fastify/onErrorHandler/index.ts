import assert from "node:assert";
import { type FastifyInstance } from "fastify";
import { metrics } from "../../metrics/index.js";

import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { isFastifyError } from "../isFastifyError/index.js";

type ErrorHandler = Parameters<FastifyInstance["setErrorHandler"]>[0];

export const onError = async (
  error: Parameters<ErrorHandler>[0],
  request: Parameters<ErrorHandler>[1],
  reply: Parameters<ErrorHandler>[2],
  pathToTemplate = "handlers/onError/index.njk",
): Promise<ReturnType<ErrorHandler>> => {
  const msg = "ERROR_CAUGHT_BY_GLOBAL_ERROR_HANDLER";

  let logger: (...args: unknown[]) => void = request.log.error;
  let statusCode = 500;

  if (isFastifyError(error) && error.code.startsWith("FST_CSRF_")) {
    logger = request.log.warn;
    statusCode = 403;
  }

  logger(error, msg);
  metrics.addMetric(msg, MetricUnit.Count, 1);

  reply.statusCode = statusCode;
  assert.ok(reply.render);
  await reply.render(pathToTemplate);
  return reply;
};
