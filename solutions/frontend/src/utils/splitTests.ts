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

export const getSplitTestBucketAssignments = (): SplitTestBucketAssignments => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return Object.fromEntries(
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
  ) as SplitTestBucketAssignments;
};
