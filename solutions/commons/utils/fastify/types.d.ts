import type { APIGatewayEvent, Context } from "aws-lambda";
import type * as v from "valibot";
import type { Scope, getClaimsSchema } from "../authorize/getClaimsSchema.ts";
import type { Actor, AnyMachineSnapshot } from "xstate";
import type { accountDeleteStateMachine } from "../../../frontend/src/journeys/utils/stateMachines/account-delete.ts";
import type { testingJourneyStateMachine } from "../../../frontend/src/journeys/utils/stateMachines/testing-journey.ts";
import type { ClientEntry } from "../../../config/schema/types.ts";
import type { authorizeErrors } from "../authorize/authorizeErrors.ts";

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
      authFrontEndUrl?: string | undefined;
      analyticsCookieDomain?: string | undefined;
      ga4ContainerId?: string | undefined;
      analyticsEnabled?: boolean | undefined;
      getRedirectToClientRedirectUri?: (
        error?: (typeof authorizeErrors)[keyof typeof authorizeErrors],
      ) => string;
    };
    journeyStates?: {
      [Scope.testingJourney]?: Actor<typeof testingJourneyStateMachine>;
      [Scope.accountDelete]?: Actor<typeof accountDeleteStateMachine>;
    };
    client?: ClientEntry;
    analytics?:
      | Partial<{
          contentId?: string;
          isPageDataSensitive?: boolean;
          taxonomyLevel1?: string;
          taxonomyLevel2?: string;
          taxonomyLevel3?: string;
          dynamic?: boolean;
          isSelectContentTrackingEnabled?: boolean;
        }>
      | undefined;
  }
}

declare module "fastify" {
  interface Session {
    expires?: number;
    _csrf?: string;
    user_id?: string;
    claims?: v.InferOutput<ReturnType<typeof getClaimsSchema>>;
    journeyStateSnapshot?: AnyMachineSnapshot;
  }
}
