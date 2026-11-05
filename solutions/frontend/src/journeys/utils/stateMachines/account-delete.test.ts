import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import {
  accountDeleteStateMachine,
  AcountDeleteJourneyState,
} from "./account-delete.js";

const startActor = (initialState?: AcountDeleteJourneyState) => {
  const actor = createActor(accountDeleteStateMachine);
  actor.start();

  if (initialState) {
    while (actor.getSnapshot().value !== initialState) {
      const current = actor.getSnapshot().value;
      if (current === AcountDeleteJourneyState.emailNotVerified) {
        actor.send({ type: "emailVerified" });
      } else if (current === AcountDeleteJourneyState.notAuthenticated) {
        actor.send({ type: "authenticated" });
      }
    }
  }

  return actor;
};

describe("accountDeleteStateMachine", () => {
  it("starts in emailNotVerified", () => {
    const actor = startActor();

    expect(actor.getSnapshot().value).toBe(
      AcountDeleteJourneyState.emailNotVerified,
    );
  });

  describe("emailNotVerified", () => {
    it("sets stateBeforeLockout to emailNotVerified on entry", () => {
      const actor = startActor();

      expect(actor.getSnapshot().context.stateBeforeLockout).toBe(
        AcountDeleteJourneyState.emailNotVerified,
      );
    });

    it("transitions to notAuthenticated on emailVerified", () => {
      const actor = startActor();
      actor.send({ type: "emailVerified" });

      expect(actor.getSnapshot().value).toBe(
        AcountDeleteJourneyState.notAuthenticated,
      );
    });

    it.each([
      "lockedOutSecurityCodeRequestedTooManyTimes",
      "lockedOutSecurityCodeEnteredTooManyTimes",
      "lockedOutPasswordEnteredTooManyTimes",
    ] as const)("transitions to %s", (event) => {
      const actor = startActor();
      actor.send({ type: event });

      expect(actor.getSnapshot().value).toBe(AcountDeleteJourneyState[event]);
    });
  });

  describe("notAuthenticated", () => {
    it("sets stateBeforeLockout to notAuthenticated on entry", () => {
      const actor = startActor(AcountDeleteJourneyState.notAuthenticated);

      expect(actor.getSnapshot().context.stateBeforeLockout).toBe(
        AcountDeleteJourneyState.notAuthenticated,
      );
    });

    it("transitions to authenticated on authenticated", () => {
      const actor = startActor(AcountDeleteJourneyState.notAuthenticated);
      actor.send({ type: "authenticated" });

      expect(actor.getSnapshot().value).toBe(
        AcountDeleteJourneyState.authenticated,
      );
    });

    it.each([
      "lockedOutSecurityCodeRequestedTooManyTimes",
      "lockedOutSecurityCodeEnteredTooManyTimes",
      "lockedOutPasswordEnteredTooManyTimes",
    ] as const)("transitions to %s", (event) => {
      const actor = startActor(AcountDeleteJourneyState.notAuthenticated);
      actor.send({ type: event });

      expect(actor.getSnapshot().value).toBe(AcountDeleteJourneyState[event]);
    });
  });

  describe("authenticated", () => {
    it("sets stateBeforeLockout to authenticated on entry", () => {
      const actor = startActor(AcountDeleteJourneyState.authenticated);

      expect(actor.getSnapshot().context.stateBeforeLockout).toBe(
        AcountDeleteJourneyState.authenticated,
      );
    });

    it.each([
      "lockedOutSecurityCodeRequestedTooManyTimes",
      "lockedOutSecurityCodeEnteredTooManyTimes",
      "lockedOutPasswordEnteredTooManyTimes",
    ] as const)("transitions to %s", (event) => {
      const actor = startActor(AcountDeleteJourneyState.authenticated);
      actor.send({ type: event });

      expect(actor.getSnapshot().value).toBe(AcountDeleteJourneyState[event]);
    });
  });

  describe.each([
    "lockedOutSecurityCodeRequestedTooManyTimes",
    "lockedOutSecurityCodeEnteredTooManyTimes",
    "lockedOutPasswordEnteredTooManyTimes",
  ] as const)("%s", (lockoutEvent) => {
    it.each([
      AcountDeleteJourneyState.emailNotVerified,
      AcountDeleteJourneyState.notAuthenticated,
      AcountDeleteJourneyState.authenticated,
    ])("returns to %s on returnToPreviousState", (previousState) => {
      const actor = startActor(previousState);
      actor.send({ type: lockoutEvent });
      actor.send({ type: "returnToPreviousState" });

      expect(actor.getSnapshot().value).toBe(previousState);
    });
  });
});
