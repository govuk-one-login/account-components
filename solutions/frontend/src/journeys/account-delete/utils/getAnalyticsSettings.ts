import type { FastifyReply } from "fastify";

export const getAnalyticsSettings = (
  settings: Partial<NonNullable<FastifyReply["analytics"]>>,
): Partial<NonNullable<FastifyReply["analytics"]>> => ({
  taxonomyLevel1: "TODO",
  taxonomyLevel2: "TODO",
  taxonomyLevel3: "TODO",
  ...settings,
});
