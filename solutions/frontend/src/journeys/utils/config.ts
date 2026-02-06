import { type getClaimsSchema } from "../../utils/getClaimsSchema.js";
import { Lang } from "../../utils/configureI18n.js";
import type { AnyStateMachine } from "xstate";
import type * as v from "valibot";
import { Scope } from "../../../../commons/utils/interfaces.js";

export const journeys = {
  [Scope.testingJourney]: async () => {
    const [stateMachineModule, en, cy] = await Promise.all([
      import("./stateMachines/testing-journey.js"),
      import("../../translations/journeys/testing-journey/en.json"),
      import("../../translations/journeys/testing-journey/cy.json"),
    ]);

    return {
      stateMachine: stateMachineModule.testingJourneyStateMachine,
      translations: {
        [Lang.English]: en,
        [Lang.Welsh]: cy,
      },
      requiredClaims: [],
    };
  },
  [Scope.passkeyCreate]: async () => {
    const [stateMachineModule, en, cy] = await Promise.all([
      import("./stateMachines/passkey-create.js"),
      import("../../translations/journeys/passkey-create/en.json"),
      import("../../translations/journeys/passkey-create/cy.json"),
    ]);

    return {
      stateMachine: stateMachineModule.passkeyCreateStateMachine,
      translations: {
        [Lang.English]: en,
        [Lang.Welsh]: cy,
      },
      requiredClaims: ["account_data_api_access_token"],
    };
  },
  [Scope.accountDelete]: async () => {
    const [stateMachineModule, en, cy] = await Promise.all([
      import("./stateMachines/account-delete.js"),
      import("../../translations/journeys/account-delete/en.json"),
      import("../../translations/journeys/account-delete/cy.json"),
    ]);

    return {
      stateMachine: stateMachineModule.accountDeleteStateMachine,
      translations: {
        [Lang.English]: en,
        [Lang.Welsh]: cy,
      },
      requiredClaims: ["account_management_api_access_token"],
    };
  },
} satisfies Record<
  Scope,
  () => Promise<{
    stateMachine: AnyStateMachine;
    translations: Record<Lang, object>;
    requiredClaims: (keyof v.InferOutput<ReturnType<typeof getClaimsSchema>>)[];
  }>
>;
