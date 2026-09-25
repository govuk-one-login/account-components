import type { FastifyRequest, FastifyReply } from "fastify";
import type { PathsMap } from "../paths.js";
import { paths } from "../paths.js";
import { Scope } from "../../../../commons/utils/commonTypes.js";
import assert from "node:assert";

const findAnalytics = (pathsMap: PathsMap, pathname: string) =>
  Object.values(pathsMap).find(
    (path) => path.path === pathname && path.analytics,
  )?.analytics;

const getAnalyticsConfig = (
  sessionSplitTestBuckets: FastifyRequest["session"]["splitTestBucketAssignments"],
  analytics: NonNullable<ReturnType<typeof findAnalytics>>,
): FastifyReply["analytics"] => {
  const { contentId, ...analyticsWithoutContentId } = analytics;

  if (contentId === undefined || typeof contentId === "string") {
    return {
      ...analyticsWithoutContentId,
      ...(contentId && { contentId }),
    };
  }

  assert.ok(sessionSplitTestBuckets);

  const bucket = sessionSplitTestBuckets[contentId[0]];
  const splitTestContentId = contentId[1][bucket];

  return {
    ...analyticsWithoutContentId,
    contentId: splitTestContentId,
  };
};

export const setAnalyticsForPath = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const url = new URL(request.url, "http://localhost");

  const analytics =
    findAnalytics(paths.others, url.pathname) ??
    findAnalytics(paths.journeys.others, url.pathname);
  if (analytics) {
    reply.analytics = getAnalyticsConfig(
      request.session.splitTestBucketAssignments,
      analytics,
    );
  }

  for (const scope of Object.values(Scope)) {
    for (const state of Object.values(paths.journeys[scope])) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const analytics = findAnalytics(state as PathsMap, url.pathname);
      if (analytics) {
        reply.analytics = getAnalyticsConfig(
          request.session.splitTestBucketAssignments,
          analytics,
        );
        return;
      }
    }
  }
};
