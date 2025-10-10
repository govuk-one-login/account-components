import type { APIGatewayEvent, Context } from "aws-lambda";

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
    globals: {
      staticHash: string;
      currentUrl?: URL;
      htmlLang?: string | undefined;
    };
  }
}

declare module "fastify" {
  interface Session {
    example?: string; // TODO remove this once there is at least one real property
  }
}
