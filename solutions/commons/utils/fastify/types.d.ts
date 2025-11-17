import type { APIGatewayEvent, Context } from "aws-lambda";
import type * as v from "valibot";
import type { getClaimsSchema } from "../../../api/src/lambda/authorize/utils/getClaimsSchema.ts";
import type { Scope } from "../authorize/getClaimsSchema.ts";
import type { accountDeleteStateMachine } from "../../../frontend/src/journeys/utils/stateMachines/account-delete.ts";
import type { Actor, SnapshotFrom } from "xstate";
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
      staticHash?: string;
      csrfToken?: string;
      currentUrl?: URL;
      htmlLang?: string | undefined;
    };
    journeyStateMachines?: {
      [Scope.accountDelete]?: Actor<typeof accountDeleteStateMachine>;
    };
  }
}

declare module "fastify" {
  interface Session {
    user_id?: string;
    claims?: v.InferOutput<ReturnType<typeof getClaimsSchema>>;
    journeyStateMachines?: {
      [Scope.accountDelete]?: SnapshotFrom<typeof accountDeleteStateMachine>;
    };
  }
}
