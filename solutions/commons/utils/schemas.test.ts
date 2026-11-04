import { describe, it, expect } from "vitest";
import * as v from "valibot";
import {
  otpsDatabaseItem,
  otpChecksDatabaseItem,
  passwordChecksDatabaseItem,
  lockoutsDatabaseItem,
} from "./schemas.js";
import { LockoutType, Source } from "./constants.js";

const now = Math.floor(Date.now() / 1000);

const baseFields = {
  id: "abc123",
  publicSubjectId: "sub123",
  source: Source["account-delete"],
  createdAt: now,
};

describe("otpsDatabaseItem", () => {
  const valid = {
    ...baseFields,
    expiresAt: now + 300,
    otp: "123456",
    used: false,
  };

  it("parses a valid item", () => {
    const result = v.parse(otpsDatabaseItem, valid);

    expect(result.id).toBe("abc123");
    expect(result.createdAt).toBe(now);
    expect(result.expiresAt).toBe(now + 300);
    expect(result.otp).toBe("123456");
    expect(result.used).toBe(false);
  });

  it("parses optional lockouts field when present", () => {
    const result = v.parse(otpsDatabaseItem, {
      ...valid,
      lockouts: [{ type: LockoutType.TooManyOTPsRequested, id: "lockout-1" }],
    });

    expect(result.lockouts).toStrictEqual([
      { type: LockoutType.TooManyOTPsRequested, id: "lockout-1" },
    ]);
  });

  it("parses when lockouts field is absent", () => {
    const result = v.parse(otpsDatabaseItem, valid);

    expect(result.lockouts).toBeUndefined();
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
    successful: true,
  };

  it("parses a valid item", () => {
    const result = v.parse(otpChecksDatabaseItem, valid);

    expect(result.id).toBe("abc123");
    expect(result.createdAt).toBe(now);
    expect(result.successful).toBe(true);
  });

  it("parses optional lockouts field when present", () => {
    const result = v.parse(otpChecksDatabaseItem, {
      ...valid,
      lockouts: [
        { type: LockoutType.TooManyIncorrectOTPsEntered, id: "lockout-1" },
      ],
    });

    expect(result.lockouts).toStrictEqual([
      { type: LockoutType.TooManyIncorrectOTPsEntered, id: "lockout-1" },
    ]);
  });

  it("parses when lockouts field is absent", () => {
    const result = v.parse(otpChecksDatabaseItem, valid);

    expect(result.lockouts).toBeUndefined();
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
    successful: false,
  };

  it("parses a valid item", () => {
    const result = v.parse(passwordChecksDatabaseItem, valid);

    expect(result.id).toBe("abc123");
    expect(result.createdAt).toBe(now);
    expect(result.successful).toBe(false);
  });

  it("parses optional lockouts field when present", () => {
    const result = v.parse(passwordChecksDatabaseItem, {
      ...valid,
      lockouts: [
        {
          type: LockoutType.TooManyIncorrectPasswordsEntered,
          id: "lockout-1",
        },
      ],
    });

    expect(result.lockouts).toStrictEqual([
      { type: LockoutType.TooManyIncorrectPasswordsEntered, id: "lockout-1" },
    ]);
  });

  it("parses when lockouts field is absent", () => {
    const result = v.parse(passwordChecksDatabaseItem, valid);

    expect(result.lockouts).toBeUndefined();
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
    id: "abc123",
    publicSubjectId: "sub123",
    source: Source["account-delete"],
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
