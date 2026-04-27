import { Metrics } from "@aws-lambda-powertools/metrics";
import type { APIGatewayProxyHandler } from "../commonTypes.js";

export const metrics = new Metrics({
  namespace: "account-components",
});

export const metricsAPIGatewayProxyHandlerWrapper = (
  handler: APIGatewayProxyHandler,
): APIGatewayProxyHandler => {
  const wrappedHandler: APIGatewayProxyHandler = async (event, context) => {
    try {
      metrics.addDimensions({
        method: event.httpMethod,
        path: event.path,
      });
      const res = await handler(event, context);
      metrics.captureColdStartMetric();
      metrics.publishStoredMetrics();
      return res;
    } catch (error) {
      metrics.captureColdStartMetric();
      metrics.publishStoredMetrics();
      throw error;
    }
  };
  return wrappedHandler;
};
