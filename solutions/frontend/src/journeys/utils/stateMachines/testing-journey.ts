import { Scope } from "../../../../../commons/utils/commonTypes.js";
import { createJourneyStateMachine } from "./index.js";
import type { MachineContext } from "xstate";

export enum TestingJourneyState {
  passwordNotProvided = "PASSWORD_NOT_PROVIDED",
  passwordProvided = "PASSWORD_PROVIDED",
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
