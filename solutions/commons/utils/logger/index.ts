import type { APIGatewayProxyHandler } from "../interfaces.js";
// eslint-disable-next-line no-restricted-imports
import { Logger } from "@aws-lambda-powertools/logger";
import { getPropsFromAPIGatewayEvent } from "../getPropsFromAPIGatewayEvent/index.js";

export const logger = new Logger();

export const loggerAPIGatewayProxyHandlerWrapper = (
  handler: APIGatewayProxyHandler,
): APIGatewayProxyHandler => {
  const wrappedHandler: APIGatewayProxyHandler = async (event, context) => {
    try {
      logger.addContext(context);

      const propsFromEvent = getPropsFromAPIGatewayEvent(event);

      logger.appendKeys({
        persistentSessionId: propsFromEvent.persistentSessionId,
        sessionId: propsFromEvent.sessionId,
        clientSessionId: propsFromEvent.clientSessionId,
        userLanguage: propsFromEvent.userLanguage,
        sourceIp: propsFromEvent.sourceIp,
        method: event.httpMethod,
        path: event.path,
        referer: event.headers["referer"],
        trace: propsFromEvent.sessionId,
      });

      const res = await handler(event, context);

      logger.info("Response", {
        statusCode: res.statusCode,
      });
      logger.resetKeys();

      return res;
    } catch (error) {
      logger.error("An error occurred", { error });
      logger.resetKeys();
      return {
        statusCode: 500,
        body: "",
      };
    }
  };
  return wrappedHandler;
};
