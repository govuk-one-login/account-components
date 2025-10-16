import { getEnvironment } from "../../getEnvironment/index.js";
import { oneDayInSeconds } from "../../contstants.js";
import type fastifyStatic from "@fastify/static";

export const addStaticAssetsCachingHeaders = (
  res: fastifyStatic.SetHeadersResponse,
) => {
  if (getEnvironment() !== "local") {
    res.setHeader(
      "cache-control",
      `public, max-age=${oneDayInSeconds.toString()}, immutable`,
    );
  }
};
