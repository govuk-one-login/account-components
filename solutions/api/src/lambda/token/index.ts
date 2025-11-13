import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { flushMetricsAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/metrics/index.js";
import { verifyClientAssertion } from "./utils/verifyClientAssertion.js";
import type { AppError } from "./utils/errors.js";
import { handleError } from "./utils/errors.js";
import type { TokenRequest } from "./utils/assertTokenRequest.js";
import { assertTokenRequest } from "./utils/assertTokenRequest.js";

export const handler = flushMetricsAPIGatewayProxyHandlerWrapper(
  async (e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const request = JSON.parse(e.body ?? "{}") as TokenRequest;

      assertTokenRequest(request);
      await verifyClientAssertion(request.client_assertion);
    } catch (error) {
      return handleError(error as AppError);
    }

    return {
      statusCode: 200,
      body: '"hello world"',
    };
  },
);
