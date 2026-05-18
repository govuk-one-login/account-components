import type { FastifyReply } from "fastify";

export const analyticsDefaults: FastifyReply["analytics"] = {
  taxonomyLevel1: "accounts",
};
