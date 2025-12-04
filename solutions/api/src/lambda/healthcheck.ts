import type { APIGatewayProxyResult } from "aws-lambda";
import { loggerAPIGatewayProxyHandlerWrapper } from "../../../commons/utils/logger/index.js";

export const handler = loggerAPIGatewayProxyHandlerWrapper(
  async (): Promise<APIGatewayProxyResult> => {
    return {
      statusCode: 200,
      body: '"ok"',
    };
  },
);
