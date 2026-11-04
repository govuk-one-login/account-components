import * as v from "valibot";
import { LockoutType, Source } from "./constants.js";

export const itemWithLockouts = v.object({
  publicSubjectId: v.string(),
  source: v.enum(Source),
  createdAt: v.number(),
  lockouts: v.optional(
    v.array(
      v.object({
        type: v.enum(LockoutType),
        id: v.string(),
      }),
    ),
  ),
});

export const otpsDatabaseItem = v.looseObject({
  id: v.string(),
  expiresAt: v.number(),
  otp: v.string(),
  used: v.boolean(),
  ...itemWithLockouts.entries,
});

export const otpChecksDatabaseItem = v.looseObject({
  id: v.string(),
  successful: v.boolean(),
  ...itemWithLockouts.entries,
});

export const passwordChecksDatabaseItem = v.looseObject({
  id: v.string(),
  successful: v.boolean(),
  ...itemWithLockouts.entries,
});

export const lockoutsDatabaseItem = v.looseObject({
  id: v.string(),
  publicSubjectId: v.string(),
  lockedOutAt: v.number(),
  lockedOutUntil: v.number(),
  source: v.enum(Source),
  type: v.enum(LockoutType),
});
