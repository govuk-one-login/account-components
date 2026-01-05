import type { APIGatewayProxyEvent } from "aws-lambda";
import * as v from "valibot";
import {
  metrics,
  logger,
} from "../../../../../commons/utils/observability/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { badRequestResponse, ErrorResponse } from "./common.js";

const queryParamsSchema = v.object({
  request: v.pipe(v.string(), v.nonEmpty()),
  response_type: v.literal("code"),
  scope: v.pipe(v.string(), v.nonEmpty()),
  client_id: v.pipe(v.string(), v.nonEmpty()),
  redirect_uri: v.pipe(v.string(), v.url()),
  state: v.optional(v.string()),
});

export const getQueryParams = (event: APIGatewayProxyEvent) => {
  const queryParams = v.safeParse(
    queryParamsSchema,
    event.queryStringParameters,
    {
      abortEarly: false,
    },
  );

  if (!queryParams.success) {
    logger.warn("Invalid Request", {
      issues: queryParams.issues,
    });
    metrics.addMetric("InvalidAuthorizeRequest", MetricUnit.Count, 1);
    return new ErrorResponse(badRequestResponse);
  }
  return queryParams.output;
};
