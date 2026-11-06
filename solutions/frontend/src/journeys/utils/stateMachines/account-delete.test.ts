import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import {
  accountDeleteStateMachine,
  AcountDeleteJourneyState,
} from "./account-delete.js";

const startActor = (initialState?: AcountDeleteJourneyState) => {
  const actor = createActor(accountDeleteStateMachine);
  actor.start();

  if (initialState === AcountDeleteJourneyState.notAuthenticated) {
    actor.send({ type: "emailVerified" });
  } else if (initialState === AcountDeleteJourneyState.authenticated) {
    actor.send({ type: "emailVerified" });
    actor.send({ type: "authenticated" });
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

    it("transitions to lockedOutPasswordEnteredTooManyTimes", () => {
      const actor = startActor(AcountDeleteJourneyState.notAuthenticated);
      actor.send({ type: "lockedOutPasswordEnteredTooManyTimes" });

      expect(actor.getSnapshot().value).toBe(
        AcountDeleteJourneyState.lockedOutPasswordEnteredTooManyTimes,
      );
    });
  });

  describe("authenticated", () => {
    it("transitions to authenticated", () => {
      const actor = startActor(AcountDeleteJourneyState.authenticated);

      expect(actor.getSnapshot().value).toBe(
        AcountDeleteJourneyState.authenticated,
      );
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
    ])("returns to %s on returnToStateBeforeLockout", (previousState) => {
      const actor = startActor(previousState);
      actor.send({ type: lockoutEvent });
      actor.send({ type: "returnToStateBeforeLockout" });

      expect(actor.getSnapshot().value).toBe(previousState);
    });
  });
});
