import { describe, it, expect } from "vitest";
import * as v from "valibot";
import {
  otpsDatabaseItem,
  otpChecksDatabaseItem,
  passwordChecksDatabaseItem,
  lockoutsDatabaseItem,
} from "./schemas.js";
import { LockoutType, Source } from "./constants.js";

const baseFields = {
  id: "abc123",
  publicSubjectId: "sub123",
  source: Source["account-delete"],
};

const now = Math.floor(Date.now() / 1000);

describe("otpsDatabaseItem", () => {
  const valid = {
    ...baseFields,
    generatedAt: now,
    expiresAt: now + 300,
    otp: "123456",
    used: false,
    hasContributedToTooManyOTPsRequestedLockout: false,
  };

  it("parses a valid item", () => {
    const result = v.parse(otpsDatabaseItem, valid);

    expect(result.generatedAt).toBe(now);
    expect(result.expiresAt).toBe(now + 300);
  });

  it("allows extra fields", () => {
    expect(() =>
      v.parse(otpsDatabaseItem, { ...valid, extra: "field" }),
    ).not.toThrow();
  });

  it("throws for invalid source", () => {
    expect(() =>
      v.parse(otpsDatabaseItem, { ...valid, source: "invalid" }),
    ).toThrow();
  });

  it("throws when a required field is missing", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { otp: _, ...withoutOtp } = valid;

    expect(() => v.parse(otpsDatabaseItem, withoutOtp)).toThrow();
  });
});

describe("otpChecksDatabaseItem", () => {
  const valid = {
    ...baseFields,
    checkedAt: now,
    successful: true,
    hasContributedToTooManyIncorrectOTPsEnteredLockout: false,
  };

  it("parses a valid item", () => {
    const result = v.parse(otpChecksDatabaseItem, valid);

    expect(result.checkedAt).toBe(now);
  });

  it("allows extra fields", () => {
    expect(() =>
      v.parse(otpChecksDatabaseItem, { ...valid, extra: "field" }),
    ).not.toThrow();
  });

  it("throws for invalid source", () => {
    expect(() =>
      v.parse(otpChecksDatabaseItem, { ...valid, source: "invalid" }),
    ).toThrow();
  });

  it("throws when a required field is missing", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { successful: _, ...withoutSuccessful } = valid;

    expect(() => v.parse(otpChecksDatabaseItem, withoutSuccessful)).toThrow();
  });
});

describe("passwordChecksDatabaseItem", () => {
  const valid = {
    ...baseFields,
    checkedAt: now,
    successful: false,
    hasContributedToTooManyIncorrectPasswordsEnteredLockout: true,
  };

  it("parses a valid item", () => {
    const result = v.parse(passwordChecksDatabaseItem, valid);

    expect(result.checkedAt).toBe(now);
  });

  it("allows extra fields", () => {
    expect(() =>
      v.parse(passwordChecksDatabaseItem, { ...valid, extra: "field" }),
    ).not.toThrow();
  });

  it("throws for invalid source", () => {
    expect(() =>
      v.parse(passwordChecksDatabaseItem, { ...valid, source: "invalid" }),
    ).toThrow();
  });

  it("throws when a required field is missing", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { successful: _, ...withoutSuccessful } = valid;

    expect(() =>
      v.parse(passwordChecksDatabaseItem, withoutSuccessful),
    ).toThrow();
  });
});

describe("lockoutsDatabaseItem", () => {
  const valid = {
    ...baseFields,
    lockedOutAt: now,
    lockedOutUntil: now + 900,
    type: LockoutType.TooManyOTPsRequested,
  };

  it("parses a valid item", () => {
    const result = v.parse(lockoutsDatabaseItem, valid);

    expect(result.lockedOutAt).toBe(now);
    expect(result.lockedOutUntil).toBe(now + 900);
  });

  it("allows extra fields", () => {
    expect(() =>
      v.parse(lockoutsDatabaseItem, { ...valid, extra: "field" }),
    ).not.toThrow();
  });

  it("throws for invalid type", () => {
    expect(() =>
      v.parse(lockoutsDatabaseItem, { ...valid, type: "invalid" }),
    ).toThrow();
  });

  it("throws for invalid source", () => {
    expect(() =>
      v.parse(lockoutsDatabaseItem, { ...valid, source: "invalid" }),
    ).toThrow();
  });

  it("parses all LockoutType values", () => {
    for (const type of Object.values(LockoutType)) {
      expect(() =>
        v.parse(lockoutsDatabaseItem, { ...valid, type }),
      ).not.toThrow();
    }
  });
});
