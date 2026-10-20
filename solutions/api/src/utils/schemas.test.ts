import { describe, it, expect } from "vitest";
import * as v from "valibot";
import {
  otpsItem,
  otpChecksItem,
  passwordChecksItem,
  lockoutStatusesItem,
} from "./schemas.js";
import { LockoutType, Source } from "../../../commons/utils/constants.js";

const baseFields = {
  id: "abc123",
  publicSubjectId: "sub123",
  source: Source["account-delete"],
};

const now = Math.floor(Date.now() / 1000);

describe("otpsItem", () => {
  const valid = {
    ...baseFields,
    generatedAt: now,
    expiresAt: now + 300,
    otp: "123456",
    used: false,
    hasContributedToTooManyOTPsRequestedLockout: false,
  };

  it("parses a valid item", () => {
    const result = v.parse(otpsItem, valid);

    expect(result.generatedAt).toBeInstanceOf(Date);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.generatedAt.getTime()).toBe(now * 1000);
  });

  it("allows extra fields", () => {
    expect(() => v.parse(otpsItem, { ...valid, extra: "field" })).not.toThrow();
  });

  it("throws for invalid source", () => {
    expect(() => v.parse(otpsItem, { ...valid, source: "invalid" })).toThrow();
  });

  it("throws when a required field is missing", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { otp: _, ...withoutOtp } = valid;

    expect(() => v.parse(otpsItem, withoutOtp)).toThrow();
  });
});

describe("otpChecksItem", () => {
  const valid = {
    ...baseFields,
    checkedAt: now,
    successful: true,
    hasContributedToTooManyIncorrectOTPsEnteredLockout: false,
  };

  it("parses a valid item", () => {
    const result = v.parse(otpChecksItem, valid);

    expect(result.checkedAt).toBeInstanceOf(Date);
    expect(result.checkedAt.getTime()).toBe(now * 1000);
  });

  it("allows extra fields", () => {
    expect(() =>
      v.parse(otpChecksItem, { ...valid, extra: "field" }),
    ).not.toThrow();
  });

  it("throws for invalid source", () => {
    expect(() =>
      v.parse(otpChecksItem, { ...valid, source: "invalid" }),
    ).toThrow();
  });

  it("throws when a required field is missing", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { successful: _, ...withoutSuccessful } = valid;

    expect(() => v.parse(otpChecksItem, withoutSuccessful)).toThrow();
  });
});

describe("passwordChecksItem", () => {
  const valid = {
    ...baseFields,
    checkedAt: now,
    successful: false,
    hasContributedToTooManyIncorrectPasswordsEnteredLockout: true,
  };

  it("parses a valid item", () => {
    const result = v.parse(passwordChecksItem, valid);

    expect(result.checkedAt).toBeInstanceOf(Date);
    expect(result.checkedAt.getTime()).toBe(now * 1000);
  });

  it("allows extra fields", () => {
    expect(() =>
      v.parse(passwordChecksItem, { ...valid, extra: "field" }),
    ).not.toThrow();
  });

  it("throws for invalid source", () => {
    expect(() =>
      v.parse(passwordChecksItem, { ...valid, source: "invalid" }),
    ).toThrow();
  });

  it("throws when a required field is missing", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { successful: _, ...withoutSuccessful } = valid;

    expect(() => v.parse(passwordChecksItem, withoutSuccessful)).toThrow();
  });
});

describe("lockoutStatusesItem", () => {
  const valid = {
    ...baseFields,
    lockedOutAt: now,
    lockedOutUntil: now + 900,
    type: LockoutType.TooManyOTPsRequested,
  };

  it("parses a valid item", () => {
    const result = v.parse(lockoutStatusesItem, valid);

    expect(result.lockedOutAt).toBeInstanceOf(Date);
    expect(result.lockedOutUntil).toBeInstanceOf(Date);
    expect(result.lockedOutAt.getTime()).toBe(now * 1000);
  });

  it("allows extra fields", () => {
    expect(() =>
      v.parse(lockoutStatusesItem, { ...valid, extra: "field" }),
    ).not.toThrow();
  });

  it("throws for invalid type", () => {
    expect(() =>
      v.parse(lockoutStatusesItem, { ...valid, type: "invalid" }),
    ).toThrow();
  });

  it("throws for invalid source", () => {
    expect(() =>
      v.parse(lockoutStatusesItem, { ...valid, source: "invalid" }),
    ).toThrow();
  });

  it("parses all LockoutType values", () => {
    for (const type of Object.values(LockoutType)) {
      expect(() =>
        v.parse(lockoutStatusesItem, { ...valid, type }),
      ).not.toThrow();
    }
  });
});
