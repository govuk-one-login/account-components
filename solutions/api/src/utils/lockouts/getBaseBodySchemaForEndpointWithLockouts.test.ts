import { describe, it, expect } from "vitest";
import * as v from "valibot";
import { LockoutType, Source } from "../../../../commons/utils/constants.js";
import { getBaseBodySchemaForEndpointWithLockouts } from "./getBaseBodySchemaForEndpointWithLockouts.js";

const schema = getBaseBodySchemaForEndpointWithLockouts({
  lockoutTypesToAlwaysCheckFor: [LockoutType.TooManyOTPsRequested],
});

const validInput = { source: Source["account-delete"] };

describe("getBaseBodySchemaForEndpointWithLockouts", () => {
  describe("source", () => {
    it("accepts a valid source", () => {
      expect(() => v.parse(schema, validInput)).not.toThrow();
    });

    it("rejects a missing source", () => {
      expect(() => v.parse(schema, {})).toThrow();
    });

    it("rejects an invalid source", () => {
      expect(() =>
        v.parse(schema, { ...validInput, source: "invalid-source" }),
      ).toThrow();
    });
  });

  describe("lockoutDuration", () => {
    it("accepts a valid positive integer", () => {
      expect(() =>
        v.parse(schema, { ...validInput, lockoutDuration: 900 }),
      ).not.toThrow();
    });

    it("accepts when omitted", () => {
      expect(() => v.parse(schema, validInput)).not.toThrow();
    });

    it("rejects zero", () => {
      expect(() =>
        v.parse(schema, { ...validInput, lockoutDuration: 0 }),
      ).toThrow();
    });

    it("rejects a non-integer", () => {
      expect(() =>
        v.parse(schema, { ...validInput, lockoutDuration: 1.5 }),
      ).toThrow();
    });
  });

  describe("lockoutsToCheckFor", () => {
    it("defaults to lockoutTypesToAlwaysCheckFor when omitted", () => {
      const result = v.parse(schema, validInput);

      expect(result.lockoutsToCheckFor).toStrictEqual([
        LockoutType.TooManyOTPsRequested,
      ]);
    });

    it("accepts an array that includes all lockoutTypesToAlwaysCheckFor", () => {
      expect(() =>
        v.parse(schema, {
          ...validInput,
          lockoutsToCheckFor: [
            LockoutType.TooManyOTPsRequested,
            LockoutType.TooManyIncorrectOTPsEntered,
          ],
        }),
      ).not.toThrow();
    });

    it("rejects an array missing a required lockout type", () => {
      expect(() =>
        v.parse(schema, {
          ...validInput,
          lockoutsToCheckFor: [LockoutType.TooManyIncorrectOTPsEntered],
        }),
      ).toThrow();
    });

    it("rejects an array containing an invalid lockout type", () => {
      expect(() =>
        v.parse(schema, {
          ...validInput,
          lockoutsToCheckFor: ["invalid-lockout-type"],
        }),
      ).toThrow();
    });

    it("enforces all lockoutTypesToAlwaysCheckFor when multiple are required", () => {
      const multiSchema = getBaseBodySchemaForEndpointWithLockouts({
        lockoutTypesToAlwaysCheckFor: [
          LockoutType.TooManyOTPsRequested,
          LockoutType.TooManyIncorrectOTPsEntered,
        ],
      });

      expect(() =>
        v.parse(multiSchema, {
          ...validInput,
          lockoutsToCheckFor: [LockoutType.TooManyOTPsRequested],
        }),
      ).toThrow();
    });
  });

  describe("maxAllowedBeforeLockout", () => {
    it("accepts when omitted", () => {
      expect(() => v.parse(schema, validInput)).not.toThrow();
    });

    it("accepts a valid count and window", () => {
      expect(() =>
        v.parse(schema, {
          ...validInput,
          maxAllowedBeforeLockout: { count: 3, window: 600 },
        }),
      ).not.toThrow();
    });

    it("accepts with only count", () => {
      expect(() =>
        v.parse(schema, {
          ...validInput,
          maxAllowedBeforeLockout: { count: 3 },
        }),
      ).not.toThrow();
    });

    it("accepts with only window", () => {
      expect(() =>
        v.parse(schema, {
          ...validInput,
          maxAllowedBeforeLockout: { window: 600 },
        }),
      ).not.toThrow();
    });

    it("rejects count of zero", () => {
      expect(() =>
        v.parse(schema, {
          ...validInput,
          maxAllowedBeforeLockout: { count: 0 },
        }),
      ).toThrow();
    });

    it("rejects a non-integer count", () => {
      expect(() =>
        v.parse(schema, {
          ...validInput,
          maxAllowedBeforeLockout: { count: 1.5 },
        }),
      ).toThrow();
    });

    it("rejects window of zero", () => {
      expect(() =>
        v.parse(schema, {
          ...validInput,
          maxAllowedBeforeLockout: { window: 0 },
        }),
      ).toThrow();
    });

    it("rejects a non-integer window", () => {
      expect(() =>
        v.parse(schema, {
          ...validInput,
          maxAllowedBeforeLockout: { window: 1.5 },
        }),
      ).toThrow();
    });
  });
});
