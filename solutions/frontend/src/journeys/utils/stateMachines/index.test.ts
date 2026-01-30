import { describe, it, expect } from "vitest";
import { createJourneyStateMachine } from "./index.js";
import { Scope } from "../../../../../commons/utils/interfaces.js";

describe("createJourneyStateMachine", () => {
  it("should create state machine with provided id", () => {
    const config = {
      initial: "idle",
      states: {
        idle: {},
      },
    };

    const machine = createJourneyStateMachine(Scope.testingJourney, config);

    expect(machine.config.id).toBe(Scope.testingJourney);
    expect(machine.config.initial).toBe("idle");
    expect(machine.config.states).toStrictEqual({ idle: {} });
  });

  it("should pass through additional arguments to createMachine", () => {
    const config = {
      initial: "start",
      states: {
        start: {},
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const options = { actions: { testAction: () => {} } };

    const machine = createJourneyStateMachine(
      Scope.accountDelete,
      config,
      options,
    );

    expect(machine.config.id).toBe(Scope.accountDelete);
    expect(machine.implementations.actions).toStrictEqual(options.actions);
  });
});
