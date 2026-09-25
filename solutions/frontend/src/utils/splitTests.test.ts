import { describe, expect, it, vi } from "vitest";
import { getSplitTestBucketAssignments, splitTests } from "./splitTests.js";

describe("splitTests", () => {
  it.each(Object.entries(splitTests))(
    "%s percentages add up to 100",
    (_, buckets) => {
      const total = Object.values(buckets).reduce(
        (sum, { percentage }) => sum + percentage,
        0,
      );

      expect(total).toBe(100);
    },
  );
});

describe("getSplitTestBucketAssignments", () => {
  it.each([
    [0, "bucket1"],
    [0.29, "bucket1"],
    [0.3, "bucket1"],
    [0.300001, "bucket2"],
    [0.79, "bucket2"],
    [0.8, "bucket2"],
    [0.800001, "bucket3"],
    [0.99, "bucket3"],
    [1, "bucket3"],
  ] as const)(
    "assigns correct bucket when Math.random() returns %f",
    (random, expectedBucket) => {
      vi.spyOn(Math, "random").mockReturnValue(random);

      expect(getSplitTestBucketAssignments()).toStrictEqual({
        testingJourneySplitTest: expectedBucket,
      });
    },
  );
});
