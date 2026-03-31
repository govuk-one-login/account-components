import type { APIGatewayProxyResult } from "aws-lambda";
import { loggerAPIGatewayProxyHandlerWrapper } from "../../../commons/utils/logger/index.js";
import { metricsAPIGatewayProxyHandlerWrapper } from "../../../commons/utils/metrics/index.js";
import { normalizeAPIGatewayProxyEventHeadersHandlerWrapper } from "../../../commons/utils/normalizeAPIGatewayProxyEventHeadersHandlerWrapper/index.js";

export const handler = normalizeAPIGatewayProxyEventHeadersHandlerWrapper(
  loggerAPIGatewayProxyHandlerWrapper(
    metricsAPIGatewayProxyHandlerWrapper(
      async (): Promise<APIGatewayProxyResult> => {
        return {
          statusCode: 200,
          body: '"ok"',
        };
      },
    ),
  ),
);
