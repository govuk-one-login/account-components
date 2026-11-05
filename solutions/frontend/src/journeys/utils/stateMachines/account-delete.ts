import type { MachineContext } from "xstate";
import { assign } from "xstate";
import { createJourneyStateMachine } from "./index.js";
import { Scope } from "../../../../../commons/utils/commonTypes.js";

export enum AcountDeleteJourneyState {
  emailNotVerified = "EMAIL_NOT_VERIFIED",
  notAuthenticated = "NOT_AUTHENTICATED",
  authenticated = "AUTHENTICATED",
  lockedOutSecurityCodeRequestedTooManyTimes = "LOCKED_OUT_SECURITY_CODE_REQUESTED_TOO_MANY_TIMES",
  lockedOutSecurityCodeEnteredTooManyTimes = "LOCKED_OUT_SECURITY_CODE_ENTERED_TOO_MANY_TIMES",
  lockedOutPasswordEnteredTooManyTimes = "LOCKED_OUT_PASSWORD_ENTERED_TOO_MANY_TIMES", // pragma: allowlist secret
}

const toLockoutStateTransitions = {
  lockedOutSecurityCodeRequestedTooManyTimes:
    AcountDeleteJourneyState.lockedOutSecurityCodeRequestedTooManyTimes,
  lockedOutSecurityCodeEnteredTooManyTimes:
    AcountDeleteJourneyState.lockedOutSecurityCodeEnteredTooManyTimes,
  lockedOutPasswordEnteredTooManyTimes:
    AcountDeleteJourneyState.lockedOutPasswordEnteredTooManyTimes,
} as const;

type AccountDeleteMachineContext = MachineContext & {
  stateBeforeLockout?: AcountDeleteJourneyState;
};

const fromLockoutStateToPreviousStateTransitions = {
  returnToPreviousState: [
    {
      guard: ({ context }: { context: AccountDeleteMachineContext }) =>
        context.stateBeforeLockout ===
        AcountDeleteJourneyState.emailNotVerified,
      target: AcountDeleteJourneyState.emailNotVerified,
    },
    {
      guard: ({ context }: { context: AccountDeleteMachineContext }) =>
        context.stateBeforeLockout ===
        AcountDeleteJourneyState.notAuthenticated,
      target: AcountDeleteJourneyState.notAuthenticated,
    },
    {
      guard: ({ context }: { context: AccountDeleteMachineContext }) =>
        context.stateBeforeLockout === AcountDeleteJourneyState.authenticated,
      target: AcountDeleteJourneyState.authenticated,
    },
  ],
};

export const accountDeleteStateMachine = createJourneyStateMachine<
  AccountDeleteMachineContext,
  | {
      type: "emailVerified";
    }
  | {
      type: "authenticated";
    }
  | { type: keyof typeof toLockoutStateTransitions }
  | {
      type: "returnToPreviousState";
    }
>(Scope.accountDelete, {
  initial: AcountDeleteJourneyState.emailNotVerified,
  states: {
    [AcountDeleteJourneyState.emailNotVerified]: {
      entry: assign({
        stateBeforeLockout: AcountDeleteJourneyState.emailNotVerified,
      }),
      on: {
        emailVerified: AcountDeleteJourneyState.notAuthenticated,
        ...toLockoutStateTransitions,
      },
    },
    [AcountDeleteJourneyState.notAuthenticated]: {
      entry: assign({
        stateBeforeLockout: AcountDeleteJourneyState.notAuthenticated,
      }),
      on: {
        authenticated: AcountDeleteJourneyState.authenticated,
        ...toLockoutStateTransitions,
      },
    },
    [AcountDeleteJourneyState.authenticated]: {
      entry: assign({
        stateBeforeLockout: AcountDeleteJourneyState.authenticated,
      }),
      on: toLockoutStateTransitions,
    },
    [AcountDeleteJourneyState.lockedOutSecurityCodeRequestedTooManyTimes]: {
      on: fromLockoutStateToPreviousStateTransitions,
    },
    [AcountDeleteJourneyState.lockedOutSecurityCodeEnteredTooManyTimes]: {
      on: fromLockoutStateToPreviousStateTransitions,
    },
    [AcountDeleteJourneyState.lockedOutPasswordEnteredTooManyTimes]: {
      on: fromLockoutStateToPreviousStateTransitions,
    },
  },
});
