import { Scope } from "../../../../../commons/utils/authorize/getClaimsSchema.js";
import { createJourneyStateMachine } from "./index.js";
import type { MachineContext } from "xstate";

export enum PasskeyCreateState {
  passwordNotProvided = "PASSWORD_NOT_PROVIDED", // pragma: allowlist secret
  passwordProvided = "PASSWORD_PROVIDED", // pragma: allowlist secret
}

export const passkeyCreateStateMachine = createJourneyStateMachine<
  MachineContext,
  {
    type: "passwordEntered";
  }
>(Scope.passkeyCreate, {
  initial: PasskeyCreateState.passwordNotProvided,
  states: {
    [PasskeyCreateState.passwordNotProvided]: {
      on: {
        passwordEntered: PasskeyCreateState.passwordProvided,
      },
    },
    [PasskeyCreateState.passwordProvided]: {},
  },
});
