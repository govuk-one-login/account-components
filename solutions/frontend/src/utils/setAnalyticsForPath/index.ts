import type { FastifyRequest, FastifyReply } from "fastify";
import type { PathsMap } from "../paths.js";
import { paths } from "../paths.js";
import { Scope } from "../../../../commons/utils/commonTypes.js";

export const setAnalyticsForPath = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const url = new URL(request.url, "http://localhost");
  const scopes = Object.values(Scope);

  for (const scope of scopes) {
    const states = paths.journeys[scope];

    for (const state of Object.values(states)) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      for (const path of Object.values(state as PathsMap)) {
        if (path.path === url.pathname && path.analytics) {
          reply.analytics = path.analytics;
          return;
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    for (const path of Object.values(paths.others as PathsMap)) {
      if (path.path === url.pathname && path.analytics) {
        reply.analytics = path.analytics;
        return;
      }
    }
  }
};
