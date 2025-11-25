import type { MachineContext } from "xstate";
import { Scope } from "../../../../../commons/utils/authorize/getClaimsSchema.js";
import { createJourneyStateMachine } from "./index.js";

export enum AcountDeleteJourneyState {
  emailNotVerified = "EMAIL_NOT_VERIFIED",
  emailVerified = "EMAIL_VERIFIED",
}

export const accountDeleteStateMachine = createJourneyStateMachine<
  MachineContext,
  {
    type: "emailVerified";
  }
>(Scope.accountDelete, {
  initial: AcountDeleteJourneyState.emailNotVerified,
  states: {
    [AcountDeleteJourneyState.emailNotVerified]: {
      on: {
        emailVerified: AcountDeleteJourneyState.emailVerified,
      },
    },
    [AcountDeleteJourneyState.emailVerified]: {},
  },
});
