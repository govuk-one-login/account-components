import { Scope } from "../../../../commons/utils/authorize/getClaimsSchema.js";
import { Lang } from "../../../../commons/utils/configureI18n/index.js";
import type { AnyStateMachine } from "xstate";

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
    };
  },
} satisfies Record<
  Scope,
  () => Promise<{
    stateMachine: AnyStateMachine;
    translations: Record<Lang, object>;
  }>
>;
