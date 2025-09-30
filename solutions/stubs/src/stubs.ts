import type {
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
import { removeTrailingSlash } from "../../commons/utils/fastify/removeTrailingSlash/index.js";
import { logRequest } from "../../commons/utils/fastify/logRequest/index.js";
import { logResponse } from "../../commons/utils/fastify/logResponse/index.js";
import { addDefaultCaching } from "../../commons/utils/fastify/addDefaultCaching/index.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { IncomingMessage } from "node:http";
import type { ResolveFastifyRequestType } from "fastify/types/type-provider.js";
import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import { render } from "../../commons/utils/fastify/render/index.js";
import fastifyFormbody from "@fastify/formbody";

export type FastifyTypeboxInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;
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
      props?: Record<string, any>,
    ) => Promise<void>;
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

export const initStubs = async function () {
  const fastify = Fastify.default({
    trustProxy: true, // Required as HTTPS is terminated before the Lambda
    logger: true,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  fastify.addHook("onRequest", logRequest);
  fastify.addHook("onRequest", removeTrailingSlash);
  fastify.addHook("onSend", (_request, reply) => addDefaultCaching(reply));
  fastify.addHook("onResponse", logResponse);

  fastify.register(fastifyCookie);
  fastify.register(fastifyFormbody);
  fastify.decorateReply("render", render);

  fastify.setNotFoundHandler(async function (request, reply) {
    const onNotFound = (await import("./handlers/onNotFound/index.js"))
      .onNotFound;
    return onNotFound.bind(this)(request, reply);
  });

  fastify.setErrorHandler(async function (error, request, reply) {
    const onError = (await import("./handlers/onError/index.js")).onError;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return onError.bind(this)(error, request, reply);
  });

  fastify.register(
    async (fastify) => {
      (
        await import("../../commons/utils/fastify/staticFiles/index.js")
      ).staticFiles(fastify);
    },
    { prefix: "/static" },
  );

  fastify.get("/healthcheck", async function (_request, reply) {
    return reply.send("ok");
  });

  fastify.get("/robots.txt", async function (request, reply) {
    return (await import("./handlers/robots.txt/index.js")).handler(
      request,
      reply,
    );
  });

  return fastify;
};
