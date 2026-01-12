import { getEnvironment } from "../../getEnvironment/index.js";
import { oneDayInSeconds } from "../../constants.js";
import type fastifyStatic from "@fastify/static";

export const addStaticAssetsCachingHeaders = (
  res: fastifyStatic.SetHeadersResponse,
  cache = true,
) => {
  if (getEnvironment() !== "local") {
    res.setHeader(
      "cache-control",
      cache
        ? `public, max-age=${oneDayInSeconds.toString()}, immutable`
        : "no-cache",
    );
  }
};
