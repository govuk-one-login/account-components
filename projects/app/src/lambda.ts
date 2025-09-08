import initApp from "./app.js";
import awsLambdaFastify from "@fastify/aws-lambda";

const app = await initApp();

export const handler = awsLambdaFastify(app, {
  binaryMimeTypes: ["image/png"],
});
// needs to be placed after awsLambdaFastify call because of the decoration: https://github.com/fastify/aws-lambda-fastify/blob/main/index.js#L9
await app.ready();
