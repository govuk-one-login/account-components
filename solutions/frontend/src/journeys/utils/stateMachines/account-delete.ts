import type { MachineContext } from "xstate";
import { createJourneyStateMachine } from "./index.js";
import { Scope } from "../../../../../commons/utils/interfaces.js";

export enum AcountDeleteJourneyState {
  emailNotVerified = "EMAIL_NOT_VERIFIED",
  notAuthenticated = "NOT_AUTHENTICATED",
  authenticated = "AUTHENTICATED",
}

export const accountDeleteStateMachine = createJourneyStateMachine<
  MachineContext,
  | {
      type: "notAuthenticated";
    }
  | {
      type: "authenticated";
    }
>(Scope.accountDelete, {
  initial: AcountDeleteJourneyState.emailNotVerified,
  states: {
    [AcountDeleteJourneyState.emailNotVerified]: {
      on: {
        notAuthenticated: AcountDeleteJourneyState.notAuthenticated,
      },
    },
    [AcountDeleteJourneyState.notAuthenticated]: {
      on: {
        authenticated: AcountDeleteJourneyState.authenticated,
      },
    },
    [AcountDeleteJourneyState.authenticated]: {},
  },
});
