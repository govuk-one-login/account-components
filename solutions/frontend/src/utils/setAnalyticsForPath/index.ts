import type { FastifyRequest, FastifyReply } from "fastify";
import type { PathsMap } from "../paths.js";
import { paths } from "../paths.js";
import { Scope } from "../../../../commons/utils/commonTypes.js";

const findAnalytics = (pathsMap: PathsMap, pathname: string) =>
  Object.values(pathsMap).find(
    (path) => path.path === pathname && path.analytics,
  )?.analytics;

export const setAnalyticsForPath = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const url = new URL(request.url, "http://localhost");

  const analytics = findAnalytics(paths.others, url.pathname);
  if (analytics) {
    reply.analytics = analytics;
  }

  for (const scope of Object.values(Scope)) {
    for (const state of Object.values(paths.journeys[scope])) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const analytics = findAnalytics(state as PathsMap, url.pathname);
      if (analytics) {
        reply.analytics = analytics;
        return;
      }
    }
  }
};
