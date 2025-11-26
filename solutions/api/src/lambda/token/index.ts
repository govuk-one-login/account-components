import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { flushMetricsAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/metrics/index.js";
import { verifyClientAssertion } from "./utils/verifyClientAssertion.js";
import { errorManager } from "./utils/errors.js";
import type { TokenAppError } from "./utils/errors.js";
import type { TokenRequest } from "./utils/assertTokenRequest.js";
import { assertTokenRequest } from "./utils/assertTokenRequest.js";
import * as querystring from "node:querystring";
import { getAuthRequest } from "./utils/getAuthRequest.js";
import { verifyJti } from "./utils/verifyJti.js";

export const handler = flushMetricsAPIGatewayProxyHandlerWrapper(
  async (e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const request = querystring.parse(
        e.body ?? "{}",
      ) as unknown as TokenRequest;

      assertTokenRequest(request);

      const assertion = await verifyClientAssertion(request.client_assertion);

      await getAuthRequest(request.code, assertion.redirect_uri);

      await verifyJti(assertion.jti);

      return {
        statusCode: 200,
        body: JSON.stringify({ hello: "world" }),
      };
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return errorManager.handleError(error as TokenAppError | Error);
    }
  },
);
