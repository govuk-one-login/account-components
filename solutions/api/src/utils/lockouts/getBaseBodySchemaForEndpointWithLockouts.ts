import * as v from "valibot";
import { LockoutType, Source } from "../../../../commons/utils/constants.js";

export const getBaseBodySchemaForEndpointWithLockouts = ({
  lockoutTypesToAlwaysCheckFor,
}: {
  lockoutTypesToAlwaysCheckFor: LockoutType[];
}) =>
  v.object({
    source: v.enum(Source),
    lockoutDuration: v.optional(v.pipe(v.number(), v.integer(), v.gtValue(0))),
    lockoutsToCheckFor: v.optional(
      v.pipe(
        v.array(v.enum(LockoutType)),
        v.check((lockoutsToCheckFor) =>
          lockoutTypesToAlwaysCheckFor.every((lockoutTypeToAlwaysCheckFor) =>
            lockoutsToCheckFor.includes(lockoutTypeToAlwaysCheckFor),
          ),
        ),
      ),
      lockoutTypesToAlwaysCheckFor,
    ),
    maxAllowedBeforeLockout: v.optional(
      v.object({
        count: v.optional(v.pipe(v.number(), v.integer(), v.gtValue(0))),
        window: v.optional(v.pipe(v.number(), v.integer(), v.gtValue(0))),
      }),
    ),
  });
