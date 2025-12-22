import type { FastifyReply } from "fastify";

export const sharedAnalyticsSettings: Partial<FastifyReply["analytics"]> = {
  taxonomyLevel1: "TODO",
  taxonomyLevel2: "TODO",
  taxonomyLevel3: "TODO",
  isPageDataSensitive: true,
  loggedInStatus: false,
  dynamic: true,
};
