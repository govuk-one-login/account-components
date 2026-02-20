import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { getBadRequestReply, ErrorResponse } from "./common.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createHash } from "node:crypto";
import { checkUserAgentCookieName } from "../../../../../commons/utils/constants.js";

export const checkSameUserAgent = async (
  request: FastifyRequest,
  reply: FastifyReply,
  requestJwe: string,
  clientId: string,
) => {
  const cookie = request.cookies[checkUserAgentCookieName];

  if (!cookie) {
    logger.warn("Cookie for checking user agent not set", {
      client_id: clientId,
    });
    metrics.addMetric("CookieForCheckingUserAgentNotSet", MetricUnit.Count, 1);
    return new ErrorResponse(getBadRequestReply(reply));
  }

  const hash = createHash("sha256").update(requestJwe).digest("hex");

  if (hash !== cookie) {
    logger.warn("User agent mismatch", {
      client_id: clientId,
      received_hash: cookie,
      calculated_hash: hash,
    });
    metrics.addMetric("UserAgentMismatch", MetricUnit.Count, 1);
    return new ErrorResponse(getBadRequestReply(reply));
  }

  return true;
};
