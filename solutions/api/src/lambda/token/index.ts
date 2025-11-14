import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { flushMetricsAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/metrics/index.js";
import { verifyClientAssertion } from "./utils/verifyClientAssertion.js";
import { errorManager } from "./utils/errors.js";
import type { TokenAppError } from "./utils/errors.js";
import type { TokenRequest } from "./utils/assertTokenRequest.js";
import { assertTokenRequest } from "./utils/assertTokenRequest.js";

export const handler = flushMetricsAPIGatewayProxyHandlerWrapper(
  async (e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const request = JSON.parse(e.body ?? "{}") as TokenRequest;

      assertTokenRequest(request);
      await verifyClientAssertion(request.client_assertion);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return errorManager.handleError(error as TokenAppError | Error);
    }

    return {
      statusCode: 200,
      body: '"hello world"',
    };
  },
);
