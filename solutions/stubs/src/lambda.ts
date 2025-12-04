import { initStubs } from "./index.js";
import awsLambdaFastify from "@fastify/aws-lambda";
import { loggerAPIGatewayProxyHandlerWrapper } from "../../commons/utils/logger/index.js";
import { metricsAPIGatewayProxyHandlerWrapper } from "../../commons/utils/metrics/index.js";

const fastify = await initStubs();

export const handler = loggerAPIGatewayProxyHandlerWrapper(
  metricsAPIGatewayProxyHandlerWrapper(awsLambdaFastify(fastify)),
);
// needs to be placed after awsLambdaFastify call because of the decoration: https://github.com/fastify/aws-lambda-fastify/blob/main/index.js#L9
await fastify.ready();
