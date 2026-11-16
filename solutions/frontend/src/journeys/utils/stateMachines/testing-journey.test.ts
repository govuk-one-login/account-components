import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import {
  testingJourneyStateMachine,
  TestingJourneyState,
} from "./testing-journey.js";

describe("testingJourneyStateMachine", () => {
  it("starts in passwordNotProvided", () => {
    const actor = createActor(testingJourneyStateMachine);
    actor.start();

    expect(actor.getSnapshot().value).toBe(
      TestingJourneyState.passwordNotProvided,
    );
  });

  it("transitions to passwordProvided on passwordEntered", () => {
    const actor = createActor(testingJourneyStateMachine);
    actor.start();
    actor.send({ type: "passwordEntered" });

    expect(actor.getSnapshot().value).toBe(
      TestingJourneyState.passwordProvided,
    );
  });
});
