import type { APIGatewayEvent, Context } from "aws-lambda";
import type * as v from "valibot";
import type { Scope, getClaimsSchema } from "../authorize/getClaimsSchema.ts";
import type { Actor, AnyMachineSnapshot } from "xstate";
import type { accountDeleteStateMachine } from "../../../frontend/src/journeys/utils/stateMachines/account-delete.ts";
import type { testingJourneyStateMachine } from "../../../frontend/src/journeys/utils/stateMachines/testing-journey.ts";
import type { ClientEntry } from "../../../config/schema/types.ts";

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
    journeyStates?: {
      [Scope.testingJourney]?: Actor<typeof testingJourneyStateMachine>;
      [Scope.accountDelete]?: Actor<typeof accountDeleteStateMachine>;
    };
    client?: ClientEntry;
  }
}

declare module "fastify" {
  interface Session {
    _csrf?: string;
    user_id?: string;
    claims?: v.InferOutput<ReturnType<typeof getClaimsSchema>>;
    journeyStateSnapshot?: AnyMachineSnapshot;
  }
}
