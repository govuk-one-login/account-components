import { getEnvironment } from "../../getEnvironment/index.js";
import { fiveMinutesInSeconds, oneDayInSeconds } from "../../constants.js";
import type fastifyStatic from "@fastify/static";

export const addStaticAssetsCachingHeaders = (
  res: fastifyStatic.SetHeadersResponse,
  allUrlsAreImmutable = false,
) => {
  if (getEnvironment() !== "local") {
    res.setHeader(
      "cache-control",
      allUrlsAreImmutable
        ? `public, max-age=${oneDayInSeconds.toString()}, immutable`
        : `public, max-age=${fiveMinutesInSeconds.toString()}`,
    );
  }
};
