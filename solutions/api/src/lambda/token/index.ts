import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  metrics,
  metricsAPIGatewayProxyHandlerWrapper,
} from "../../../../commons/utils/metrics/index.js";
import { verifyClientAssertion } from "./utils/verifyClientAssertion.js";
import { errorManager } from "./utils/errors.js";
import type { TokenAppError } from "./utils/errors.js";
import type { TokenRequest } from "./utils/assertTokenRequest.js";
import { assertTokenRequest } from "./utils/assertTokenRequest.js";
import * as querystring from "node:querystring";
import { getAuthRequest } from "./utils/getAuthRequest.js";
import { verifyJti } from "./utils/verifyJti.js";
import { loggerAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/logger/index.js";
import { createAccessToken } from "./utils/createAccessToken.js";
import { getApiBaseUrlWithStage } from "../../utils/common.js";
import { normalizeAPIGatewayProxyEventHandlerWrapper } from "../../../../commons/utils/normalizeAPIGatewayProxyEventHandlerWrapper/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

export const handler = normalizeAPIGatewayProxyEventHandlerWrapper(
  loggerAPIGatewayProxyHandlerWrapper(
    metricsAPIGatewayProxyHandlerWrapper(
      async (e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        metrics.addMetric("TokenRequest", MetricUnit.Count, 1);

        try {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          const request = querystring.parse(
            e.body ?? "{}",
          ) as unknown as TokenRequest;

          assertTokenRequest(request);

          const apiBaseUrl = getApiBaseUrlWithStage(e);

          const assertion = await verifyClientAssertion(
            request.client_assertion,
            apiBaseUrl,
          );

          const authRequest = await getAuthRequest(
            request.code,
            request.redirect_uri,
            String(assertion.iss),
          );

          await verifyJti(assertion.jti);

          const accessToken = await createAccessToken(authRequest, apiBaseUrl);

          return {
            statusCode: 200,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              access_token: accessToken,
              token_type: "Bearer",
              expires_in: 300,
            }),
          };
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          return errorManager.handleError(error as TokenAppError | Error);
        }
      },
    ),
  ),
);
