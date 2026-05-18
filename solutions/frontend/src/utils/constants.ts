import type { FastifyReply } from "fastify";

export const rootCookieDomain = process.env["ROOT_DOMAIN"];

export const analyticsDefaults: FastifyReply["analytics"] = {
  taxonomyLevel1: "accounts",
};
