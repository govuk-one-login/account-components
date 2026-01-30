import * as v from "valibot";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { ErrorResponse, getBadRequestReply } from "./common.js";
import type { FastifyReply } from "fastify";
import { logger } from "../../../../../commons/utils/logger/index.js";

const queryParamsSchema = v.object({
  request: v.pipe(v.string(), v.nonEmpty()),
  response_type: v.literal("code"),
  scope: v.pipe(v.string(), v.nonEmpty()),
  client_id: v.pipe(v.string(), v.nonEmpty()),
  redirect_uri: v.pipe(v.string(), v.url()),
  state: v.optional(v.string()),
});

export const getQueryParams = (reply: FastifyReply, query: unknown) => {
  const queryParams = v.safeParse(queryParamsSchema, query, {
    abortEarly: false,
  });

  if (!queryParams.success) {
    logger.warn("Invalid Request", {
      issues: queryParams.issues,
    });
    metrics.addMetric("InvalidAuthorizeRequest", MetricUnit.Count, 1);
    return new ErrorResponse(getBadRequestReply(reply));
  }
  return queryParams.output;
};
