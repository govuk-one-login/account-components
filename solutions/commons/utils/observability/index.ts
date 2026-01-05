import type { APIGatewayProxyHandler } from "../interfaces.js";
// eslint-disable-next-line no-restricted-imports
import { Logger } from "@aws-lambda-powertools/logger";
import { getPropsForLoggingFromEvent } from "../getPropsForLoggingFromEvent/index.js";
// eslint-disable-next-line no-restricted-imports
import type { Attributes } from "@opentelemetry/api";
// eslint-disable-next-line no-restricted-imports
import { trace as otelTrace } from "@opentelemetry/api";
// eslint-disable-next-line no-restricted-imports
import { Metrics } from "@aws-lambda-powertools/metrics";

export const logger = new Logger();

export const metrics = new Metrics({
  namespace: "account-components",
});

export const trace = otelTrace;

export const setObservabilityAttributes = (attributes: Attributes) => {
  const formattedAttributes: Record<string, string> = {};

  Object.entries(attributes).forEach(
    ([key, value]) =>
      (formattedAttributes[key] =
        typeof value === "string" ? value : JSON.stringify(value)),
  );

  logger.appendKeys(formattedAttributes);

  const currentSpan = trace.getActiveSpan();
  if (currentSpan?.isRecording()) {
    currentSpan.setAttributes(formattedAttributes);
  }

  metrics.addDimensions(formattedAttributes);
};

export const observabilityAPIGatewayProxyHandlerWrapper = (
  handler: APIGatewayProxyHandler,
): APIGatewayProxyHandler => {
  const wrappedHandler: APIGatewayProxyHandler = async (event, context) => {
    try {
      logger.addContext(context);

      const propsForLoggingFromEvent = getPropsForLoggingFromEvent(event);
      const props = {
        persistentSessionId: propsForLoggingFromEvent.persistentSessionId,
        sessionId: propsForLoggingFromEvent.sessionId,
        clientSessionId: propsForLoggingFromEvent.clientSessionId,
        userLanguage: propsForLoggingFromEvent.userLanguage,
        sourceIp: propsForLoggingFromEvent.sourceIp,
        method: event.httpMethod,
        path: event.path,
        referer: event.headers["referer"],
        trace: propsForLoggingFromEvent.sessionId,
      };

      setObservabilityAttributes(props);

      const res = await handler(event, context);

      setObservabilityAttributes({
        statusCode: res.statusCode,
      });

      metrics.captureColdStartMetric();
      metrics.publishStoredMetrics();

      logger.info("Response", {
        statusCode: res.statusCode,
      });
      logger.resetKeys();

      return res;
    } catch (error) {
      logger.error("An error occurred", { error });
      logger.resetKeys();

      metrics.captureColdStartMetric();
      metrics.publishStoredMetrics();

      return {
        statusCode: 500,
        body: "",
      };
    }
  };
  return wrappedHandler;
};
