import type { APIGatewayProxyResult } from "aws-lambda";
import { observabilityAPIGatewayProxyHandlerWrapper } from "../../../commons/utils/observability/index.js";

export const handler = observabilityAPIGatewayProxyHandlerWrapper(
  async (): Promise<APIGatewayProxyResult> => {
    return {
      statusCode: 200,
      body: '"ok"',
    };
  },
);
