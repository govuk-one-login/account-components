import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import assert from "node:assert";
import { getErrorResponse } from "./utils/common.js";
import { logger } from "../../../../commons/utils/logger/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  flushMetricsAPIGatewayProxyHandlerWrapper,
  metrics,
} from "../../../../commons/utils/metrics/index.js";
import { verifyClientAssertion } from "./utils/verifyClientAssertion.js";

interface TokenRequest {
  grant_type: string;
  code: string;
  client_assertion_type: string;
  client_assertion: string;
}

const assertTokenRequest = (request: TokenRequest) => {
  assert(request.grant_type === "authorization_code", "Invalid grant_type");
  assert(request.code, "Missing code");
  assert(
    request.client_assertion_type ===
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    "Invalid client_assertion_type",
  );
  assert(request.client_assertion, "Missing client_assertion");
};

export const handler = flushMetricsAPIGatewayProxyHandlerWrapper(
  async (e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const request = JSON.parse(e.body ?? "{}") as TokenRequest;

      assertTokenRequest(request);
      await verifyClientAssertion(request.client_assertion);
    } catch (error) {
      logger.warn("Invalid Request", {
        error,
      });
      metrics.addMetric("InvalidTokenRequest", MetricUnit.Count, 1);
      return getErrorResponse("invalidRequest");
    }

    return {
      statusCode: 200,
      body: '"hello world"',
    };
  },
);
