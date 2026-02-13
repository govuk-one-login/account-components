import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/server";
import { assign } from "xstate";
import { createJourneyStateMachine } from "./index.js";
import { Scope } from "../../../../../commons/utils/interfaces.js";

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
