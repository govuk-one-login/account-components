import type { FastifyPluginOptions, FastifyInstance } from "fastify";
import type { APIGatewayEvent, Context } from "aws-lambda";
import { resolveEnvVarToBool } from "./utils/resolveEnvVarToBool/index.js";
import { removeTrailingSlash } from "./utils/removeTrailingSlash/index.js";
import { logRequest } from "./utils/logRequest/index.js";
import { logResponse } from "./utils/logResponse/index.js";
import { addDefaultCaching } from "./utils/addDefaultCaching/index.js";

declare module "fastify" {
  interface FastifyRequest {
    awsLambda?: {
      event: APIGatewayEvent;
      context: Context;
    };
  }
  interface FastifyReply {
    render?: (
      templatePath: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      props: Record<string, any>,
    ) => Promise<void>;
  }
}

declare module "fastify" {
  interface Session {
    example?: string; // TODO remove this once there is at least one real property
  }
}

const initApp = async function (
  fastify?: FastifyInstance,
  // @ts-expect-error  - it is necessary to include this argument even though it isn't used as otherwise the command to generate OpenAPI documents errors saying that the function should have two arguments
  opts?: FastifyPluginOptions, // eslint-disable-line
) {
  const isGeneratingOpenApiDocs = !!fastify;
  const app =
    fastify ??
    (await import("fastify")).default({
      trustProxy: true, // Required as HTTPS is terminated before the Lambda
      logger: true,
      disableRequestLogging: true,
    });

  if (isGeneratingOpenApiDocs) {
    app.register((await import("@fastify/swagger")).default, {
      openapi: {},
    });
  }

  if (resolveEnvVarToBool("REGISTER_PRIVATE_ROUTES")) {
    app.register((await import("./private/index.js")).privateRoutes);
  }
  if (resolveEnvVarToBool("REGISTER_PUBLIC_ROUTES")) {
    app.register((await import("./public/index.js")).publicRoutes);
  }

  app.addHook("onRequest", logRequest);
  app.addHook("onRequest", removeTrailingSlash);
  app.addHook("onSend", (_request, reply) => addDefaultCaching(reply));
  app.addHook("onResponse", logResponse);

  return app;
};

// eslint-disable-next-line
export default initApp;
