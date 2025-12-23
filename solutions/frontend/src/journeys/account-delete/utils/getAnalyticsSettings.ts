import type { FastifyReply } from "fastify";
import { resolveEnvVarToBool } from "../../../../../commons/utils/resolveEnvVarToBool/index.js";

type AnalyticsSettings = Partial<NonNullable<FastifyReply["analytics"]>>;

export const getAnalyticsSettings = (
  settings: AnalyticsSettings & {
    loggedInStatus: NonNullable<AnalyticsSettings["loggedInStatus"]>;
  },
): AnalyticsSettings => ({
  enabled: resolveEnvVarToBool("ANALYTICS_ENABLED"),
  taxonomyLevel1: "TODO",
  taxonomyLevel2: "TODO",
  taxonomyLevel3: "TODO",
  ...settings,
});
