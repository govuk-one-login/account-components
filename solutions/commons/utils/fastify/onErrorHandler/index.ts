import assert from "node:assert";
import type { FastifyInstance } from "fastify";
import { metrics } from "../../metrics/index.js";

import { MetricUnit } from "@aws-lambda-powertools/metrics";

type ErrorHandler = Parameters<FastifyInstance["setErrorHandler"]>[0];

export const onError = async (
  error: Parameters<ErrorHandler>[0],
  request: Parameters<ErrorHandler>[1],
  reply: Parameters<ErrorHandler>[2],
  pathToTemplate = "handlers/onError/index.njk",
): Promise<ReturnType<ErrorHandler>> => {
  const msg = "ERROR_CAUGHT_BY_GLOBAL_ERROR_HANDLER";
  request.log.error(error, msg);
  metrics.addMetric(msg, MetricUnit.Count, 1);

  reply.statusCode = 500;
  assert.ok(reply.render);
  await reply.render(pathToTemplate);
  return reply;
};
