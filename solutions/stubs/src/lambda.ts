import { initStubs } from "./index.js";
import awsLambdaFastify from "@fastify/aws-lambda";
import { observabilityAPIGatewayProxyHandlerWrapper } from "../../commons/utils/observability/index.js";

const fastify = await initStubs();

export const handler = observabilityAPIGatewayProxyHandlerWrapper(
  awsLambdaFastify(fastify),
);
// needs to be placed after awsLambdaFastify call because of the decoration: https://github.com/fastify/aws-lambda-fastify/blob/main/index.js#L9
await fastify.ready();
