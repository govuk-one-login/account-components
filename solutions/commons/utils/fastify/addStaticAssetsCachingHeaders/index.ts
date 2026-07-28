import { getEnvironment } from "../../getEnvironment/index.js";
import { fiveMinutesInSeconds, oneDayInSeconds } from "../../constants.js";
import type { FastifyReply } from "fastify";

export const addStaticAssetsCachingHeaders = (
  res: FastifyReply,
  allUrlsAreImmutable = false,
) => {
  if (getEnvironment() !== "local") {
    res.header(
      "cache-control",
      allUrlsAreImmutable
        ? `public, max-age=${oneDayInSeconds.toString()}, immutable`
        : `public, max-age=${fiveMinutesInSeconds.toString()}`,
    );
  }
};
