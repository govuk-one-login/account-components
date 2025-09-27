import type {
  FastifyPluginOptions,
  FastifyInstance,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  FastifySchema,
  FastifyRequest,
  RouteGenericInterface,
} from "fastify";
import type { APIGatewayEvent, Context } from "aws-lambda";
import { resolveEnvVarToBool } from "./utils/resolveEnvVarToBool/index.js";
import { removeTrailingSlash } from "./handlers/removeTrailingSlash/index.js";
import { logRequest } from "./handlers/logRequest/index.js";
import { logResponse } from "./handlers/logResponse/index.js";
import { addDefaultCaching } from "./handlers/addDefaultCaching/index.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { IncomingMessage } from "node:http";
import type { ResolveFastifyRequestType } from "fastify/types/type-provider.js";
import type i18next from "i18next";

export enum Lang {
  English = "en",
  Welsh = "cy",
}

export type FastifyTypeboxInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;
declare module "fastify" {
  interface FastifyRequest {
    lang?: Lang;
    awsLambda?: {
      event: APIGatewayEvent;
      context: Context;
    };
  }
  interface FastifyReply {
    render?: (
      templatePath: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      props?: Record<string, any>,
    ) => Promise<void>;
    i18next?: typeof i18next;
  }
}

declare module "fastify" {
  interface Session {
    example?: string; // TODO remove this once there is at least one real property
  }
}

export type FastifyRequestWithSchema<
  Schema extends FastifySchema = FastifySchema,
> = FastifyRequest<
  RouteGenericInterface,
  RawServerDefault,
  IncomingMessage,
  Schema,
  TypeBoxTypeProvider,
  unknown,
  FastifyBaseLogger,
  ResolveFastifyRequestType<TypeBoxTypeProvider, Schema, RouteGenericInterface>
>;

const initApp = async function (
  fastify?: FastifyTypeboxInstance,
  // @ts-expect-error  - it is necessary to include this argument even though it isn't used as otherwise the command to generate OpenAPI documents errors saying that the function should have two arguments
  opts?: FastifyPluginOptions, // eslint-disable-line
) {
  const isGeneratingOpenApiDocs = !!fastify;
  const app =
    fastify ??
    (await import("fastify"))
      .default({
        trustProxy: true, // Required as HTTPS is terminated before the Lambda
        logger: true,
        disableRequestLogging: true,
      })
      .withTypeProvider<TypeBoxTypeProvider>();

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error, "An error occurred");
    reply.statusCode = 500;
    return reply.send("An error occurred");
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
