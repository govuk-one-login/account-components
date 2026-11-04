import * as v from "valibot";
import { LockoutType, Source } from "./constants.js";

export const otpsDatabaseItem = v.looseObject({
  id: v.string(),
  publicSubjectId: v.string(),
  generatedAt: v.number(),
  expiresAt: v.number(),
  source: v.enum(Source),
  otp: v.string(),
  used: v.boolean(),
  lockoutId: v.optional(v.string()),
});

export const otpChecksDatabaseItem = v.looseObject({
  id: v.string(),
  publicSubjectId: v.string(),
  checkedAt: v.number(),
  source: v.enum(Source),
  successful: v.boolean(),
  lockoutId: v.optional(v.string()),
});

export const passwordChecksDatabaseItem = v.looseObject({
  id: v.string(),
  publicSubjectId: v.string(),
  checkedAt: v.number(),
  source: v.enum(Source),
  successful: v.boolean(),
  lockoutId: v.optional(v.string()),
});

export const lockoutsDatabaseItem = v.looseObject({
  id: v.string(),
  publicSubjectId: v.string(),
  lockedOutAt: v.number(),
  lockedOutUntil: v.number(),
  source: v.enum(Source),
  type: v.enum(LockoutType),
});
