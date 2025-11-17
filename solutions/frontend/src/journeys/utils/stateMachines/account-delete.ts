import {
  createJourneyStateMachine,
  type JourneyStateMachineContext,
  type JourneyStateMachineMeta,
} from "../index.js";

export const accountDeleteStateMachine = createJourneyStateMachine<
  JourneyStateMachineMeta & {
    plarp: string;
  },
  JourneyStateMachineContext & {
    thing: number;
  }
>({
  context: {
    thing: 5,
    isRestored: false,
    journeyOutcome: {},
  },
});
