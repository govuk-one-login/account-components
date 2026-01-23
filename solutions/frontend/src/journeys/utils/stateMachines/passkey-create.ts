import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/server";
import { assign } from "xstate";
import { Scope } from "../../../../../commons/utils/authorize/getClaimsSchema.js";
import { createJourneyStateMachine } from "./index.js";

export enum PasskeyCreateState {
  notCreated = "NOT_CREATED",
}

export const passkeyCreateStateMachine = createJourneyStateMachine<
  {
    registrationOptions?: PublicKeyCredentialCreationOptionsJSON;
  },
  {
    type: "updateRegistrationOptions";
    registrationOptions: PublicKeyCredentialCreationOptionsJSON;
  }
>(Scope.testingJourney, {
  initial: PasskeyCreateState.notCreated,
  states: {
    [PasskeyCreateState.notCreated]: {
      on: {
        updateRegistrationOptions: {
          actions: assign(({ event }) => ({
            registrationOptions: event.registrationOptions,
          })),
        },
      },
    },
  },
});
