import { Scope } from "../../../../commons/utils/authorize/getClaimsSchema.js";
import { accountDeleteStateMachine } from "./stateMachines/account-delete.js";
import type { JourneyPath } from "../../utils/paths.js";
import type {
  AnyEventObject,
  AnyStateMachine,
  EventObject,
  MachineContext,
  MetaObject,
  NonReducibleUnknown,
  ParameterizedObject,
  ProvidedActor,
} from "xstate";
import { createMachine } from "xstate";

export const journeys = {
  [Scope.accountDelete]: accountDeleteStateMachine,
} satisfies Record<Scope, AnyStateMachine>;

export type JourneyStateMachineContext = MachineContext & {
  isRestored: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  journeyOutcome: Record<string, any>;
};

export type JourneyStateMachineMeta = MetaObject & {
  path: JourneyPath;
};

export const createJourneyStateMachine = <
  TMeta extends MetaObject = MetaObject,
  TContext extends JourneyStateMachineContext = JourneyStateMachineContext,
  TEvent extends AnyEventObject = AnyEventObject,
  TActor extends ProvidedActor = ProvidedActor,
  TAction extends ParameterizedObject = ParameterizedObject,
  TGuard extends ParameterizedObject = ParameterizedObject,
  TDelay extends string = string,
  TTag extends string = string,
  TInput = unknown,
  TOutput extends NonReducibleUnknown = NonReducibleUnknown,
  TEmitted extends EventObject = EventObject,
>(
  ...args: Parameters<
    typeof createMachine<
      TContext,
      TEvent,
      TActor,
      TAction,
      TGuard,
      TDelay,
      TTag,
      TInput,
      TOutput,
      TEmitted,
      TMeta
    >
  >
) => {
  return createMachine<
    TContext,
    TEvent,
    TActor,
    TAction,
    TGuard,
    TDelay,
    TTag,
    TInput,
    TOutput,
    TEmitted,
    TMeta
  >(...args);
};
