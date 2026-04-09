import type { APIGatewayProxyResult } from "aws-lambda";
import {
  logger,
  loggerAPIGatewayProxyHandlerWrapper,
} from "../../../commons/utils/logger/index.js";
import { metricsAPIGatewayProxyHandlerWrapper } from "../../../commons/utils/metrics/index.js";
import { normalizeAPIGatewayProxyEventHandlerWrapper } from "../../../commons/utils/normalizeAPIGatewayProxyEventHandlerWrapper/index.js";

export const handler = normalizeAPIGatewayProxyEventHandlerWrapper(
  loggerAPIGatewayProxyHandlerWrapper(
    metricsAPIGatewayProxyHandlerWrapper(
      async (): Promise<APIGatewayProxyResult> => {
        logger.debug("DEBUG1");
        logger.info("INFO1");
        logger.warn("WARN1");
        logger.error("ERROR1");
        logger.critical("CRITICAL1");

        return {
          statusCode: 200,
          body: '"ok"',
        };
      },
    ),
  ),
);
