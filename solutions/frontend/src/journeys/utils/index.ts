import { Scope } from "../../../../commons/utils/authorize/getClaimsSchema.js";
import { Lang } from "../../../../commons/utils/configureI18n/index.js";
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
  [Scope.testingJourney]: async () => {
    const [stateMachineModule, en, cy] = await Promise.all([
      import("./stateMachines/testing-journey.js"),
      import("../../translations/journeys/testing-journey/en.json"),
      import("../../translations/journeys/testing-journey/cy.json"),
    ]);

    return {
      stateMachine: stateMachineModule.testingJourneyStateMachine,
      translations: {
        [Lang.English]: en,
        [Lang.Welsh]: cy,
      },
    };
  },
  [Scope.accountDelete]: async () => {
    const [stateMachineModule, en, cy] = await Promise.all([
      import("./stateMachines/account-delete.js"),
      import("../../translations/journeys/account-delete/en.json"),
      import("../../translations/journeys/account-delete/cy.json"),
    ]);

    return {
      stateMachine: stateMachineModule.accountDeleteStateMachine,
      translations: {
        [Lang.English]: en,
        [Lang.Welsh]: cy,
      },
    };
  },
} satisfies Record<
  Scope,
  () => Promise<{
    stateMachine: AnyStateMachine;
    translations: Record<Lang, object>;
  }>
>;

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
