import { describe, it, expect, vi } from "vitest";
import { journeys } from "./config.js";
import { Lang } from "../../utils/configureI18n.js";
import { Scope } from "../../../../commons/utils/interfaces.js";

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
