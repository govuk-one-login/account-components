import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as v from "valibot";
import { logger } from "../../../commons/utils/logger/index.js";
import assert from "node:assert";
import { metrics } from "../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

const queryParamsSchema = v.object({
  request: v.pipe(v.string(), v.nonEmpty()),
  response_type: v.literal("code"),
  scope: v.pipe(v.string(), v.nonEmpty()),
  client_id: v.pipe(v.string(), v.nonEmpty()),
  redirect_uri: v.pipe(v.string(), v.url()),
});

assert.ok(
  process.env["AUTHORIZE_ERROR_PAGE_URL"],
  "AUTHORIZE_ERROR_PAGE_URL not set",
);

const badRequestError: APIGatewayProxyResult = {
  statusCode: 302,
  headers: {
    location: process.env["AUTHORIZE_ERROR_PAGE_URL"],
  },
  body: "",
};

export const checkRequest = (event: APIGatewayProxyEvent) => {
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
    return badRequestError;
  }
  return undefined;
};

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const checkRequestResult = checkRequest(event);
  if (checkRequestResult) {
    return checkRequestResult;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Authorized" }),
  };
};
