import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import {
  getAndSetSplitTestBucketAssignments,
  splitTests,
} from "./splitTests.js";
import { logger } from "../../../commons/utils/logger/index.js";

// @ts-expect-error
vi.mock(import("../../../commons/utils/logger/index.js"), () => ({
  logger: { appendKeys: vi.fn() },
}));

const makeRequest = (cookieValue?: string): FastifyRequest =>
  ({
    cookies: { splitTestBucketAssignments: cookieValue },
  }) as unknown as FastifyRequest;

const makeReply = (): FastifyReply =>
  ({ setCookie: vi.fn() }) as unknown as FastifyReply;

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

describe("getAndSetSplitTestBucketAssignments", () => {
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

      expect(
        getAndSetSplitTestBucketAssignments(makeRequest(), makeReply()),
      ).toStrictEqual({
        testingJourneySplitTest: expectedBucket,
      });
    },
  );

  it("uses valid bucket assignment from cookie over randomly assigned bucket", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(
      getAndSetSplitTestBucketAssignments(
        makeRequest(JSON.stringify({ testingJourneySplitTest: "bucket3" })),
        makeReply(),
      ),
    ).toStrictEqual({ testingJourneySplitTest: "bucket3" });
  });

  it("ignores invalid bucket value in cookie and uses randomly assigned bucket", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(
      getAndSetSplitTestBucketAssignments(
        makeRequest(
          JSON.stringify({ testingJourneySplitTest: "invalidBucket" }),
        ),
        makeReply(),
      ),
    ).toStrictEqual({ testingJourneySplitTest: "bucket1" });
  });

  it("ignores invalid cookie and uses randomly assigned bucket", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(
      getAndSetSplitTestBucketAssignments(
        makeRequest("not-valid-json"),
        makeReply(),
      ),
    ).toStrictEqual({ testingJourneySplitTest: "bucket1" });
  });

  it("sets the cookie when no cookie is present", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const reply = makeReply();

    getAndSetSplitTestBucketAssignments(makeRequest(), reply);

    expect(reply.setCookie).toHaveBeenCalledWith(
      "splitTestBucketAssignments",
      JSON.stringify({ testingJourneySplitTest: "bucket1" }),
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60,
      }),
    );
  });

  it("appends split test bucket assignments to the logger", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    getAndSetSplitTestBucketAssignments(makeRequest(), makeReply());

    expect(logger.appendKeys).toHaveBeenCalledWith({
      splitTestBucketAssignments: { testingJourneySplitTest: "bucket1" },
    });
  });

  it("does not set the cookie when it already matches the assignments", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const reply = makeReply();
    const cookieValue = JSON.stringify({ testingJourneySplitTest: "bucket1" });

    getAndSetSplitTestBucketAssignments(makeRequest(cookieValue), reply);

    expect(reply.setCookie).not.toHaveBeenCalled();
  });
});
