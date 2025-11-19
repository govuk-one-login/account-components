import { describe, it, expect, vi } from "vitest";
import { journeys, createJourneyStateMachine } from "./index.js";
import { Scope } from "../../../../commons/utils/authorize/getClaimsSchema.js";
import { Lang } from "../../../../commons/utils/configureI18n/index.js";

// @ts-expect-error
vi.mock(import("./stateMachines/testing-journey.js"), () => ({
  testingJourneyStateMachine: { id: "testing-journey" },
}));

// @ts-expect-error
vi.mock(import("./stateMachines/account-delete.js"), () => ({
  accountDeleteStateMachine: { id: "account-delete" },
}));

// @ts-expect-error
vi.mock(import("../../translations/journeys/testing-journey/en.json"), () => ({
  key: "value-en",
}));

// @ts-expect-error
vi.mock(import("../../translations/journeys/testing-journey/cy.json"), () => ({
  key: "value-cy",
}));

// @ts-expect-error
vi.mock(import("../../translations/journeys/account-delete/en.json"), () => ({
  delete: "delete-en",
}));

// @ts-expect-error
vi.mock(import("../../translations/journeys/account-delete/cy.json"), () => ({
  delete: "delete-cy",
}));

describe("journeys", () => {
  it("should load testing journey with state machine and translations", async () => {
    const result = await journeys[Scope.testingJourney]();

    expect(result.stateMachine).toStrictEqual({ id: "testing-journey" });
    expect(result.translations).toStrictEqual({
      [Lang.English]: { key: "value-en" },
      [Lang.Welsh]: { key: "value-cy" },
    });
  });

  it("should load account delete journey with state machine and translations", async () => {
    const result = await journeys[Scope.accountDelete]();

    expect(result.stateMachine).toStrictEqual({ id: "account-delete" });
    expect(result.translations).toStrictEqual({
      [Lang.English]: { delete: "delete-en" },
      [Lang.Welsh]: { delete: "delete-cy" },
    });
  });
});

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
