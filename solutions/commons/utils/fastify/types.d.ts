import type { APIGatewayEvent, Context } from "aws-lambda";
import type * as v from "valibot";
import type { getClaimsSchema } from "../../../api/src/lambda/authorize/utils/getClaimsSchema.ts";
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
      csrfToken?: string;
      currentUrl?: URL;
      htmlLang?: string | undefined;
    };
  }
}

declare module "fastify" {
  interface Session {
    user_id?: string;
    claims?: v.InferOutput<ReturnType<typeof getClaimsSchema>>;
  }
}
