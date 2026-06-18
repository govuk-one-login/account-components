import type { MachineContext } from "xstate";
import { createJourneyStateMachine } from "./index.js";
import { Scope } from "../../../../../commons/utils/commonTypes.js";

export enum AcountDeleteJourneyState {
  emailNotVerified = "EMAIL_NOT_VERIFIED",
  lockedOutSecurityCodeEnteredTooManyTimes = "LOCKED_OUT_SECURITY_CODE_ENTERED_TOO_MANY_TIMES",
  notAuthenticated = "NOT_AUTHENTICATED",
  authenticated = "AUTHENTICATED",
}

export const accountDeleteStateMachine = createJourneyStateMachine<
  MachineContext,
  | {
      type: "notAuthenticated";
    }
  | {
      type: "lockedOutSecurityCodeEnteredTooManyTimes";
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
        lockedOutSecurityCodeEnteredTooManyTimes:
          AcountDeleteJourneyState.lockedOutSecurityCodeEnteredTooManyTimes,
      },
    },
    [AcountDeleteJourneyState.lockedOutSecurityCodeEnteredTooManyTimes]: {},
    [AcountDeleteJourneyState.notAuthenticated]: {
      on: {
        authenticated: AcountDeleteJourneyState.authenticated,
      },
    },
    [AcountDeleteJourneyState.authenticated]: {},
  },
});
