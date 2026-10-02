import type { FastifyReply, FastifyRequest } from "fastify";
import * as v from "valibot";
import { resolveEnvVarToBool } from "../../resolveEnvVarToBool/index.js";
import { logger } from "../../logger/index.js";
import { getAppConfig } from "../../getAppConfig/index.js";
import type { AppConfigSchema } from "../../../../config/schema/types.js";

export const splitTestOverridesCookieName = "split_test_overrides";

export type SplitTestBucketAssignments = {
  [
    Test in keyof AppConfigSchema["split_tests"]
  ]: keyof AppConfigSchema["split_tests"][Test];
};

export const getSplitTestBucketAssignmentsSchema = async () => {
  const appConfig = await getAppConfig();

  return v.pipe(
    v.partial(
      v.object(
        Object.fromEntries(
          Object.entries(appConfig.split_tests).map(([testName, buckets]) => [
            testName,
            v.fallback(v.optional(v.picklist(Object.keys(buckets))), undefined),
          ]),
        ),
      ),
    ),
    v.transform((input) => {
      return Object.fromEntries(
        Object.entries(input).filter((entry): entry is [string, string] => {
          return entry[1] !== undefined;
        }),
      );
    }),
  );
};

export const setSplitTestBucketAssignments = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const appConfig = await getAppConfig();

  const newSplitTestBucketAssignments = Object.fromEntries(
    Object.entries(appConfig.split_tests).flatMap(([testName, buckets]) => {
      const roll = Math.random() * 100;
      let cumulative = 0;
      for (const [bucket, { percentage }] of Object.entries(buckets)) {
        cumulative += percentage;
        if (roll <= cumulative) return [[testName, bucket]];
      }
      // Unreachable: Math.random() returns a value in [0, 1) so roll is always in [0, 100).
      // Since percentages are validated to sum to 100, cumulative will reach 100 on the
      // last bucket, meaning roll <= cumulative will always be true before the loop ends.
      // The fallback is required by TypeScript as it cannot infer that the loop will always
      // return a value.
      return [];
    }),
  );

  const splitTestBucketAssignmentsSchema =
    await getSplitTestBucketAssignmentsSchema();

  const splitTestBucketAssignmentsFromSession = v.safeParse(
    splitTestBucketAssignmentsSchema,
    request.session.splitTestBucketAssignments,
  );

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  let splitTestBucketAssignments = (
    splitTestBucketAssignmentsFromSession.success
      ? {
          ...newSplitTestBucketAssignments,
          ...splitTestBucketAssignmentsFromSession.output,
        }
      : newSplitTestBucketAssignments
  ) as SplitTestBucketAssignments;

  const splitTestBucketAssignmentsFromCookie = resolveEnvVarToBool(
    "SPLIT_TESTS_COOKIE_OVERRIDE",
  )
    ? v.safeParse(
        v.pipe(v.string(), v.parseJson(), splitTestBucketAssignmentsSchema),
        request.cookies[splitTestOverridesCookieName],
      )
    : undefined;

  splitTestBucketAssignments = splitTestBucketAssignmentsFromCookie?.success
    ? {
        ...splitTestBucketAssignments,
        ...splitTestBucketAssignmentsFromCookie.output,
      }
    : splitTestBucketAssignments;

  logger.appendKeys({ splitTestBucketAssignments: splitTestBucketAssignments });
  logger.info("Split test buckets assigned");

  request.session.splitTestBucketAssignments = splitTestBucketAssignments;
  reply.globals.splitTestBucketAssignments =
    request.session.splitTestBucketAssignments;
};
