import type { Lang } from "./setUpI18n/index.js";
import type { APIGatewayEvent, Context } from "aws-lambda";
import type i18next from "i18next";

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
    globals: {
      staticHash: string;
    };
  }
}

declare module "fastify" {
  interface Session {
    user_id?: string;
  }
}
