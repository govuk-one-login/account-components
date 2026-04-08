import type { APIGatewayProxyResult } from "aws-lambda";
import { loggerAPIGatewayProxyHandlerWrapper } from "../../../commons/utils/logger/index.js";
import { metricsAPIGatewayProxyHandlerWrapper } from "../../../commons/utils/metrics/index.js";
import { normalizeAPIGatewayProxyEventHandlerWrapper } from "../../../commons/utils/normalizeAPIGatewayProxyEventHandlerWrapper/index.js";

export const handler = normalizeAPIGatewayProxyEventHandlerWrapper(
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
