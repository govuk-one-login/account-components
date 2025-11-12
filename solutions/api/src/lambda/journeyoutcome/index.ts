import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { getHeader, getErrorResponse } from "../../utils/common.js";
import { Errors } from "./utils/common.js";
import {
  flushMetricsAPIGatewayProxyHandlerWrapper,
  metrics,
} from "../../../../commons/utils/metrics/index.js";

export const handler = flushMetricsAPIGatewayProxyHandlerWrapper(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const bearerPrefix = "Bearer ";
    const authorisationHeader = getHeader(event.headers, "Authorization");

    if (authorisationHeader?.startsWith(bearerPrefix)) {
      // process token here
      return {
        statusCode: 200,
        body: '"hello world"',
      };
    } else {
      metrics.addMetric("InvalidAuthorizationHeader", MetricUnit.Count, 1);
      return getErrorResponse(Errors.invalidRequest);
    }
  },
);
