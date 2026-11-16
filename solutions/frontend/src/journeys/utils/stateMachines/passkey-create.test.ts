import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import {
  passkeyCreateStateMachine,
  PasskeyCreateState,
} from "./passkey-create.js";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/server";

const mockRegistrationOptions: PublicKeyCredentialCreationOptionsJSON = {
  challenge: "test-challenge",
  rp: { name: "test-rp" },
  user: { id: "test-user-id", name: "test-user", displayName: "Test User" },
  pubKeyCredParams: [],
};

describe("passkeyCreateStateMachine", () => {
  it("starts in notCreated", () => {
    const actor = createActor(passkeyCreateStateMachine);
    actor.start();

    expect(actor.getSnapshot().value).toBe(PasskeyCreateState.notCreated);
  });

  it("has no registrationOptions in context initially", () => {
    const actor = createActor(passkeyCreateStateMachine);
    actor.start();

    expect(actor.getSnapshot().context.registrationOptions).toBeUndefined();
  });

  it("updates registrationOptions in context on updateRegistrationOptions", () => {
    const actor = createActor(passkeyCreateStateMachine);
    actor.start();
    actor.send({
      type: "updateRegistrationOptions",
      registrationOptions: mockRegistrationOptions,
    });

    expect(actor.getSnapshot().context.registrationOptions).toStrictEqual(
      mockRegistrationOptions,
    );
  });

  it("remains in notCreated after updateRegistrationOptions", () => {
    const actor = createActor(passkeyCreateStateMachine);
    actor.start();
    actor.send({
      type: "updateRegistrationOptions",
      registrationOptions: mockRegistrationOptions,
    });

    expect(actor.getSnapshot().value).toBe(PasskeyCreateState.notCreated);
  });
});
