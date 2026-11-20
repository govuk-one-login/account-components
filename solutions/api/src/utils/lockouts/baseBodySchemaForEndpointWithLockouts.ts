import * as v from "valibot";
import { Source } from "../../../../commons/utils/constants.js";

export const baseBodySchemaForEndpointWithLockouts = v.object({
  source: v.enum(Source),
  lockoutDuration: v.optional(v.pipe(v.number(), v.integer(), v.gtValue(0))),
  maxAllowedBeforeLockout: v.optional(
    v.object({
      count: v.optional(v.pipe(v.number(), v.integer(), v.gtValue(0))),
      window: v.optional(v.pipe(v.number(), v.integer(), v.gtValue(0))),
    }),
  ),
});
