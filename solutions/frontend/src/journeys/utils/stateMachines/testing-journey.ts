import { Scope } from "../../../../../commons/utils/authorize/getClaimsSchema.js";
import { createJourneyStateMachine } from "../index.js";
import type { MachineContext } from "xstate";

export enum TestingJourneyState {
  beforePasswordEntered = "BEFORE_PASSWORD_ENTERED", // pragma: allowlist secret
  afterPasswordEntered = "AFTER_PASSWORD_ENTERED", // pragma: allowlist secret
}

export const testingJourneyStateMachine = createJourneyStateMachine<
  MachineContext,
  {
    type: "passwordEntered";
  }
>(Scope.testingJourney, {
  initial: TestingJourneyState.beforePasswordEntered,
  states: {
    [TestingJourneyState.beforePasswordEntered]: {
      on: {
        passwordEntered: TestingJourneyState.afterPasswordEntered,
      },
    },
    [TestingJourneyState.afterPasswordEntered]: {},
  },
});
