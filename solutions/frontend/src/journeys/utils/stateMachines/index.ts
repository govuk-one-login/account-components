import type {
  AnyEventObject,
  EventObject,
  MachineContext,
  MetaObject,
  NonReducibleUnknown,
  ParameterizedObject,
  ProvidedActor,
} from "xstate";
import { createMachine } from "xstate";
import type { Scope } from "../../../../../commons/utils/interfaces.js";

export const createJourneyStateMachine = <
  TContext extends MachineContext = MachineContext,
  TEvent extends AnyEventObject = AnyEventObject,
  TActor extends ProvidedActor = ProvidedActor,
  TAction extends ParameterizedObject = ParameterizedObject,
  TGuard extends ParameterizedObject = ParameterizedObject,
  TDelay extends string = string,
  TTag extends string = string,
  TInput = unknown,
  TOutput extends NonReducibleUnknown = NonReducibleUnknown,
  TEmitted extends EventObject = EventObject,
  TMeta extends MetaObject = MetaObject,
>(
  id: Scope,
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
  const [config, ...restArgs] = args;
  config.id = id;

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
  >(config, ...restArgs);
};
