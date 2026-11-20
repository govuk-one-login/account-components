import { describe, it, expect } from "vitest";
import * as v from "valibot";
import { Source } from "../../../../commons/utils/constants.js";
import { baseBodySchemaForEndpointWithLockouts } from "./baseBodySchemaForEndpointWithLockouts.js";

const validInput = { source: Source["account-delete"] };

describe("baseBodySchemaForEndpointWithLockouts", () => {
  describe("source", () => {
    it("accepts a valid source", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, validInput),
      ).not.toThrow();
    });

    it("rejects a missing source", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, {}),
      ).toThrow();
    });

    it("rejects an invalid source", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, {
          ...validInput,
          source: "invalid-source",
        }),
      ).toThrow();
    });
  });

  describe("lockoutDuration", () => {
    it("accepts a valid positive integer", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, {
          ...validInput,
          lockoutDuration: 900,
        }),
      ).not.toThrow();
    });

    it("accepts when omitted", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, validInput),
      ).not.toThrow();
    });

    it("rejects zero", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, {
          ...validInput,
          lockoutDuration: 0,
        }),
      ).toThrow();
    });

    it("rejects a non-integer", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, {
          ...validInput,
          lockoutDuration: 1.5,
        }),
      ).toThrow();
    });
  });

  describe("maxAllowedBeforeLockout", () => {
    it("accepts when omitted", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, validInput),
      ).not.toThrow();
    });

    it("accepts a valid count and window", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, {
          ...validInput,
          maxAllowedBeforeLockout: { count: 3, window: 600 },
        }),
      ).not.toThrow();
    });

    it("accepts with only count", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, {
          ...validInput,
          maxAllowedBeforeLockout: { count: 3 },
        }),
      ).not.toThrow();
    });

    it("accepts with only window", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, {
          ...validInput,
          maxAllowedBeforeLockout: { window: 600 },
        }),
      ).not.toThrow();
    });

    it("rejects count of zero", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, {
          ...validInput,
          maxAllowedBeforeLockout: { count: 0 },
        }),
      ).toThrow();
    });

    it("rejects a non-integer count", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, {
          ...validInput,
          maxAllowedBeforeLockout: { count: 1.5 },
        }),
      ).toThrow();
    });

    it("rejects window of zero", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, {
          ...validInput,
          maxAllowedBeforeLockout: { window: 0 },
        }),
      ).toThrow();
    });

    it("rejects a non-integer window", () => {
      expect(() =>
        v.parse(baseBodySchemaForEndpointWithLockouts, {
          ...validInput,
          maxAllowedBeforeLockout: { window: 1.5 },
        }),
      ).toThrow();
    });
  });
});
