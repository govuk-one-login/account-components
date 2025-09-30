import { initFrontend } from "./frontend.js";
import awsLambdaFastify from "@fastify/aws-lambda";

const fastify = await initFrontend();

export const handler = awsLambdaFastify(fastify, {
  binaryMimeTypes: ["image/png"],
});
// needs to be placed after awsLambdaFastify call because of the decoration: https://github.com/fastify/aws-lambda-fastify/blob/main/index.js#L9
await fastify.ready();
