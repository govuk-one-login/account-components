import type { APIGatewayProxyHandler } from "../interfaces.js";
// eslint-disable-next-line no-restricted-imports
import { Logger } from "@aws-lambda-powertools/logger";
import { getUsefulPropsForLoggingFromEvent } from "../getUsefulPropsForLoggingFromEvent/index.js";

export const logger = new Logger();

export const loggerAPIGatewayProxyHandlerWrapper = (
  handler: APIGatewayProxyHandler,
): APIGatewayProxyHandler => {
  const wrappedHandler: APIGatewayProxyHandler = async (event, context) => {
    try {
      logger.addContext(context);

      const usefulPropsForLoggingFromEvent =
        getUsefulPropsForLoggingFromEvent(event);

      logger.appendKeys({
        persistentSessionId: usefulPropsForLoggingFromEvent.persistentSessionId,
        sessionId: usefulPropsForLoggingFromEvent.sessionId,
        clientSessionId: usefulPropsForLoggingFromEvent.clientSessionId,
        userLanguage: usefulPropsForLoggingFromEvent.userLanguage,
        sourceIp: usefulPropsForLoggingFromEvent.sourceIp,
        method: event.httpMethod,
        path: event.path,
        referer: event.headers["referer"],
        trace: usefulPropsForLoggingFromEvent.sessionId,
      });

      const res = await handler(event, context);

      logger.info("Response", {
        statusCode: res.statusCode,
      });

      return res;
    } catch (error) {
      logger.error("An error occurred", { error });
      return {
        statusCode: 500,
        body: "",
      };
    }
  };
  return wrappedHandler;
};
