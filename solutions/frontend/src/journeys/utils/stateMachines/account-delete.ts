import { Scope } from "../../../../../commons/utils/authorize/getClaimsSchema.js";
import { createJourneyStateMachine } from "../index.js";

export enum AcountDeleteJourneyState {
  TODO = "TODO",
}

export const accountDeleteStateMachine = createJourneyStateMachine(
  Scope.accountDelete,
  {
    initial: AcountDeleteJourneyState.TODO,
    states: {
      [AcountDeleteJourneyState.TODO]: {},
    },
  },
);
