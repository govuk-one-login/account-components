import { Metrics } from "@aws-lambda-powertools/metrics";
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

export const metrics = new Metrics({
  namespace: "account-components",
});

type APIGatewayProxyHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
) => Promise<APIGatewayProxyResult>;

export const flushMetricsAPIGatewayProxyHandlerWrapper = (
  handler: APIGatewayProxyHandler,
): APIGatewayProxyHandler => {
  const wrappedHandler: APIGatewayProxyHandler = async (event, context) => {
    try {
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
