import { parse } from "cookie";
import type { APIGatewayProxyHandler } from "../interfaces.js";
// eslint-disable-next-line no-restricted-imports
import { Logger } from "@aws-lambda-powertools/logger";
import { getDiSessionIdsFromEvent } from "../getDiSessionIdsFromEvent/index.js";

export const logger = new Logger();

export const loggerAPIGatewayProxyHandlerWrapper = (
  handler: APIGatewayProxyHandler,
): APIGatewayProxyHandler => {
  const wrappedHandler: APIGatewayProxyHandler = async (event, context) => {
    try {
      logger.addContext(context);

      const cookies = parse(event.headers["cookie"] ?? "");

      const diSessionIds = getDiSessionIdsFromEvent(event);

      logger.appendKeys({
        ...diSessionIds,
        userLanguage: event.headers["user-language"] ?? cookies["lng"],
        sourceIp:
          event.headers["x-forwarded-for"] ??
          event.requestContext.identity.sourceIp,
        method: event.httpMethod,
        path: event.path,
        referer: event.headers["referer"],
        trace: diSessionIds.sessionId,
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
