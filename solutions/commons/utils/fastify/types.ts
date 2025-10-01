import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type {
  FastifyBaseLogger,
  FastifyInstance,
  //FastifyRequest,
  //FastifySchema,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  //RouteGenericInterface,
} from "fastify";
import type { Lang } from "./setUpI18n/index.js";
import type { APIGatewayEvent, Context } from "aws-lambda";
import type i18next from "i18next";
//import type { IncomingMessage } from "node:http";
//import type { ResolveFastifyRequestType } from "fastify/types/type-provider.js";

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

export type FastifyTypeboxInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

/*
Commenting out as it's not actually used yet, but will be used later
export type FastifyRequestWithTypeboxSchema<
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
*/
