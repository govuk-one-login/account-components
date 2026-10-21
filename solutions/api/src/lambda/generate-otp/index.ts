import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { metricsAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/metrics/index.js";
import { loggerAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/logger/index.js";
import { normalizeAPIGatewayProxyEventHandlerWrapper } from "../../../../commons/utils/normalizeAPIGatewayProxyEventHandlerWrapper/index.js";

export const handler = normalizeAPIGatewayProxyEventHandlerWrapper(
  loggerAPIGatewayProxyHandlerWrapper(
    metricsAPIGatewayProxyHandlerWrapper(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (_e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        return Promise.resolve({
          statusCode: 200,
          body: JSON.stringify({
            TODO: "TODO",
          }),
        });
      },
    ),
  ),
);
