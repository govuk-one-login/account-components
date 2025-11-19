import { Scope } from "../../../../../commons/utils/authorize/getClaimsSchema.js";
import { createJourneyStateMachine } from "../index.js";
import type { MachineContext } from "xstate";

export enum TestingJourneyState {
  passwordNotProvided = "PASSWORD_NOT_PROVIDED", // pragma: allowlist secret
  passwordProvided = "PASSWORD_PROVIDED", // pragma: allowlist secret
}

export const testingJourneyStateMachine = createJourneyStateMachine<
  MachineContext,
  {
    type: "passwordEntered";
  }
>(Scope.testingJourney, {
  initial: TestingJourneyState.passwordNotProvided,
  states: {
    [TestingJourneyState.passwordNotProvided]: {
      on: {
        passwordEntered: TestingJourneyState.passwordProvided,
      },
    },
    [TestingJourneyState.passwordProvided]: {},
  },
});
