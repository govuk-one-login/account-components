import * as v from "valibot";
import { LockoutType, Source } from "../../../commons/utils/constants.js";

const unixEpochTimeInSecondsToDate = v.pipe(
  v.number(),
  v.transform((value) => new Date(value * 1000)),
);

export const otpsItem = v.looseObject({
  id: v.string(),
  publicSubjectId: v.string(),
  generatedAt: unixEpochTimeInSecondsToDate,
  expiresAt: unixEpochTimeInSecondsToDate,
  source: v.enum(Source),
  otp: v.string(),
  used: v.boolean(),
  hasContributedToTooManyOTPsRequestedLockout: v.boolean(),
});

export const otpChecksItem = v.looseObject({
  id: v.string(),
  publicSubjectId: v.string(),
  checkedAt: unixEpochTimeInSecondsToDate,
  source: v.enum(Source),
  successful: v.boolean(),
  hasContributedToTooManyIncorrectOTPsEnteredLockout: v.boolean(),
});

export const passwordChecksItem = v.looseObject({
  id: v.string(),
  publicSubjectId: v.string(),
  checkedAt: unixEpochTimeInSecondsToDate,
  source: v.enum(Source),
  successful: v.boolean(),
  hasContributedToTooManyIncorrectPasswordsEnteredLockout: v.boolean(),
});

export const lockoutsItem = v.looseObject({
  id: v.string(),
  publicSubjectId: v.string(),
  lockedOutAt: unixEpochTimeInSecondsToDate,
  lockedOutUntil: unixEpochTimeInSecondsToDate,
  source: v.enum(Source),
  type: v.enum(LockoutType),
});
