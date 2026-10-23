import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { setSplitTestBucketAssignments } from "./index.js";
import { logger } from "../../logger/index.js";

// @ts-expect-error
vi.mock(import("../../logger/index.js"), () => ({
  logger: { appendKeys: vi.fn(), info: vi.fn() },
}));

const { mockResolveEnvVarToBool } = vi.hoisted(() => ({
  mockResolveEnvVarToBool: vi.fn().mockReturnValue(false),
}));

vi.mock(import("../../resolveEnvVarToBool/index.js"), () => ({
  resolveEnvVarToBool: mockResolveEnvVarToBool,
}));

vi.mock(import("../../getAppConfig/index.js"), () => ({
  getAppConfig: vi.fn().mockResolvedValue({
    split_tests: {
      testingJourneySplitTest: {
        bucket1: { percentage: 50 },
        bucket2: { percentage: 30 },
        bucket3: { percentage: 20 },
      },
    },
  }),
}));

const makeRequest = (
  sessionValue?: unknown,
  cookies: Record<string, string> = {},
): FastifyRequest =>
  ({
    session: { splitTestBucketAssignments: sessionValue },
    cookies,
  }) as unknown as FastifyRequest;

const makeReply = (): FastifyReply =>
  ({ globals: {} }) as unknown as FastifyReply;

describe("setSplitTestBucketAssignments", () => {
  it.each([
    [0, "bucket1"],
    [0.49, "bucket1"],
    [0.5, "bucket1"],
    [0.500001, "bucket2"],
    [0.79, "bucket2"],
    [0.8, "bucket2"],
    [0.800001, "bucket3"],
    [0.99, "bucket3"],
    [1, "bucket3"],
  ] as const)(
    "assigns correct bucket when Math.random() returns %f",
    async (random, expectedBucket) => {
      vi.spyOn(Math, "random").mockReturnValue(random);
      const request = makeRequest();
      const reply = makeReply();

      await setSplitTestBucketAssignments(request, reply);

      expect(request.session.splitTestBucketAssignments).toStrictEqual({
        testingJourneySplitTest: expectedBucket,
      });
    },
  );

  it("uses valid bucket assignment from session over randomly assigned bucket", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const request = makeRequest({ testingJourneySplitTest: "bucket3" });
    const reply = makeReply();

    await setSplitTestBucketAssignments(request, reply);

    expect(request.session.splitTestBucketAssignments).toStrictEqual({
      testingJourneySplitTest: "bucket3",
    });
  });

  it("ignores invalid bucket value in session and uses randomly assigned bucket", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const request = makeRequest({ testingJourneySplitTest: "invalidBucket" });
    const reply = makeReply();

    await setSplitTestBucketAssignments(request, reply);

    expect(request.session.splitTestBucketAssignments).toStrictEqual({
      testingJourneySplitTest: "bucket1",
    });
  });

  it("ignores invalid session value and uses randomly assigned bucket", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const request = makeRequest("not-valid");
    const reply = makeReply();

    await setSplitTestBucketAssignments(request, reply);

    expect(request.session.splitTestBucketAssignments).toStrictEqual({
      testingJourneySplitTest: "bucket1",
    });
  });

  it("sets reply.globals.splitTestBucketAssignments", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const request = makeRequest();
    const reply = makeReply();

    await setSplitTestBucketAssignments(request, reply);

    expect(reply.globals.splitTestBucketAssignments).toStrictEqual({
      testingJourneySplitTest: "bucket1",
    });
  });

  it("appends split test bucket assignments to the logger", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    await setSplitTestBucketAssignments(makeRequest(), makeReply());

    expect(logger.appendKeys).toHaveBeenCalledWith({
      splitTestBucketAssignments: { testingJourneySplitTest: "bucket1" },
    });
    expect(logger.info).toHaveBeenCalledWith("Split test buckets assigned");
  });

  it("applies cookie override when SPLIT_TESTS_COOKIE_OVERRIDE is enabled", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    mockResolveEnvVarToBool.mockReturnValue(true);
    const request = makeRequest(undefined, {
      split_test_overrides: JSON.stringify({
        testingJourneySplitTest: "bucket3",
      }),
    });
    const reply = makeReply();

    await setSplitTestBucketAssignments(request, reply);

    expect(request.session.splitTestBucketAssignments).toStrictEqual({
      testingJourneySplitTest: "bucket3",
    });
  });

  it("ignores cookie override when SPLIT_TESTS_COOKIE_OVERRIDE is disabled", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    mockResolveEnvVarToBool.mockReturnValue(false);
    const request = makeRequest(undefined, {
      split_test_overrides: JSON.stringify({
        testingJourneySplitTest: "bucket3",
      }),
    });
    const reply = makeReply();

    await setSplitTestBucketAssignments(request, reply);

    expect(request.session.splitTestBucketAssignments).toStrictEqual({
      testingJourneySplitTest: "bucket1",
    });
  });

  it("ignores invalid cookie override value and keeps session assignment", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    mockResolveEnvVarToBool.mockReturnValue(true);
    const request = makeRequest(undefined, {
      split_test_overrides: "not-valid-json",
    });
    const reply = makeReply();

    await setSplitTestBucketAssignments(request, reply);

    expect(request.session.splitTestBucketAssignments).toStrictEqual({
      testingJourneySplitTest: "bucket1",
    });
  });
});
