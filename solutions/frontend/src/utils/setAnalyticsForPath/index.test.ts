import { beforeEach, describe, expect, it, vi } from "vitest";
import { setAnalyticsForPath } from "./index.js";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { paths } from "../paths.js";

vi.mock(import("../paths.js"), () => ({
  paths: {
    others: {
      withAnalytics: {
        path: "/with-analytics",
        analytics: {
          taxonomyLevel1: "accounts",
          contentId: "static-content-id",
        },
      },
      withoutAnalytics: {
        path: "/without-analytics",
      },
    },
    journeys: {
      "testing-journey": {
        stateA: {
          withAnalytics: {
            path: "/journey/with-analytics",
            analytics: {
              taxonomyLevel1: "accounts",
              taxonomyLevel2: "journey",
            },
          },
          withoutAnalytics: {
            path: "/journey/without-analytics",
          },
          withSplitTest: {
            path: "/journey/split-test",
            analytics: {
              taxonomyLevel1: "accounts",
              contentId: [
                "testSplitTest",
                {
                  bucket1: "split-test-bucket1-content-id",
                  bucket2: "split-test-bucket2-content-id",
                },
              ],
            },
          },
          withQueryParams: {
            path: "/journey/query-params",
            analytics: { taxonomyLevel1: "accounts" },
          },
        },
      },
      "account-delete": {},
      "passkey-create": {},
      others: {
        withAnalytics: {
          path: "/journey/other-with-analytics",
          analytics: { taxonomyLevel1: "accounts" },
        },
      },
    },
  } as unknown as typeof paths,
}));

describe("setAnalyticsForPath", () => {
  let reply: Partial<FastifyReply>;

  beforeEach(() => {
    reply = {};
  });

  it("should set analytics on reply when path in paths.journeys.others has analytics defined", async () => {
    const request = { url: "/journey/other-with-analytics", session: {} };

    await setAnalyticsForPath(
      request as unknown as FastifyRequest,
      reply as FastifyReply,
    );

    expect(reply.analytics).toStrictEqual({ taxonomyLevel1: "accounts" });
  });

  it("should set analytics on reply when path in paths.others has analytics defined", async () => {
    const request = { url: "/with-analytics", session: {} };

    await setAnalyticsForPath(
      request as unknown as FastifyRequest,
      reply as FastifyReply,
    );

    expect(reply.analytics).toStrictEqual({
      taxonomyLevel1: "accounts",
      contentId: "static-content-id",
    });
  });

  it("should not set analytics on reply when path in paths.others has no analytics defined", async () => {
    const request = { url: "/without-analytics", session: {} };

    await setAnalyticsForPath(
      request as unknown as FastifyRequest,
      reply as FastifyReply,
    );

    expect(reply.analytics).toBeUndefined();
  });

  it("should set analytics on reply when journey path has analytics defined", async () => {
    const request = { url: "/journey/with-analytics", session: {} };

    await setAnalyticsForPath(
      request as unknown as FastifyRequest,
      reply as FastifyReply,
    );

    expect(reply.analytics).toStrictEqual({
      taxonomyLevel1: "accounts",
      taxonomyLevel2: "journey",
    });
  });

  it("should not set analytics on reply when journey path has no analytics defined", async () => {
    const request = { url: "/journey/without-analytics", session: {} };

    await setAnalyticsForPath(
      request as unknown as FastifyRequest,
      reply as FastifyReply,
    );

    expect(reply.analytics).toBeUndefined();
  });

  it("should not set analytics on reply when path does not match any known path", async () => {
    const request = { url: "/unknown-path", session: {} };

    await setAnalyticsForPath(
      request as unknown as FastifyRequest,
      reply as FastifyReply,
    );

    expect(reply.analytics).toBeUndefined();
  });

  it("should match path ignoring query parameters", async () => {
    const request = { url: "/journey/query-params?foo=bar", session: {} };

    await setAnalyticsForPath(
      request as unknown as FastifyRequest,
      reply as FastifyReply,
    );

    expect(reply.analytics).toStrictEqual({ taxonomyLevel1: "accounts" });
  });

  it("should resolve split test contentId from session bucket assignment", async () => {
    const request = {
      url: "/journey/split-test",
      session: {
        splitTestBucketAssignments: { testSplitTest: "bucket1" },
      },
    };

    await setAnalyticsForPath(
      request as unknown as FastifyRequest,
      reply as FastifyReply,
    );

    expect(reply.analytics).toStrictEqual({
      taxonomyLevel1: "accounts",
      contentId: "split-test-bucket1-content-id",
    });
  });

  it("should throw when split test path has no splitTestBucketAssignments in session", async () => {
    const request = { url: "/journey/split-test", session: {} };

    await expect(
      setAnalyticsForPath(
        request as unknown as FastifyRequest,
        reply as FastifyReply,
      ),
    ).rejects.toThrow();
  });
});
