import type { FastifyReply, FastifyRequest } from "fastify";
import * as v from "valibot";
import { logger } from "../../../commons/utils/logger/index.js";

interface SplitTestBucket {
  percentage: number;
}

type SplitTest = Record<string, SplitTestBucket>;

export const splitTests = {
  testingJourneySplitTest: {
    bucket1: {
      percentage: 30,
    },
    bucket2: {
      percentage: 50,
    },
    bucket3: {
      percentage: 20,
    },
  },
} as const satisfies Record<string, SplitTest>;

export type SplitTestBucketAssignments = {
  [Test in keyof typeof splitTests]: keyof (typeof splitTests)[Test];
};

const splitTestBucketAssignmentsCookieSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.partial(
    v.object(
      Object.fromEntries(
        Object.entries(splitTests).map(([testName, buckets]) => [
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

export const getAndSetSplitTestBucketAssignments = (
  request: FastifyRequest,
  reply: FastifyReply,
): SplitTestBucketAssignments => {
  const newSplitTestBucketAssignments = Object.fromEntries(
    Object.entries(splitTests).flatMap(([testName, buckets]) => {
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

  const splitTestBucketAssignmentsFromCookie = v.safeParse(
    splitTestBucketAssignmentsCookieSchema,
    request.cookies["splitTestBucketAssignments"],
  );

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const splitTestBucketAssignments = (
    splitTestBucketAssignmentsFromCookie.success
      ? {
          ...newSplitTestBucketAssignments,
          ...splitTestBucketAssignmentsFromCookie.output,
        }
      : newSplitTestBucketAssignments
  ) as SplitTestBucketAssignments;

  logger.appendKeys({ splitTestBucketAssignments: splitTestBucketAssignments });

  const splitTestBucketAssignmentsAsString = JSON.stringify(
    splitTestBucketAssignments,
  );

  if (
    splitTestBucketAssignmentsAsString !==
    request.cookies["splitTestBucketAssignments"]
  ) {
    reply.setCookie(
      "splitTestBucketAssignments",
      splitTestBucketAssignmentsAsString,
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60,
      },
    );
  }

  return splitTestBucketAssignments;
};
