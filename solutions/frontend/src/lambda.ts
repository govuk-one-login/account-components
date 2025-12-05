import { initFrontend } from "./index.js";
import awsLambdaFastify from "@fastify/aws-lambda";
import { loggerAPIGatewayProxyHandlerWrapper } from "../../commons/utils/logger/index.js";
import { metricsAPIGatewayProxyHandlerWrapper } from "../../commons/utils/metrics/index.js";

const fastify = await initFrontend();

export const handler = loggerAPIGatewayProxyHandlerWrapper(
  metricsAPIGatewayProxyHandlerWrapper(
    awsLambdaFastify(fastify, {
      binaryMimeTypes: [
        "image/png",
        "font/woff",
        "font/woff2",
        "image/x-icon",
        "image/vnd.microsoft.icon",
      ],
    }),
  ),
);
// needs to be placed after awsLambdaFastify call because of the decoration: https://github.com/fastify/aws-lambda-fastify/blob/main/index.js#L9
await fastify.ready();
