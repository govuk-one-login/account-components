import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  ErrorResponse,
  getRedirectToClientRedirectUriResponse,
} from "./common.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createHash } from "node:crypto";
import { checkUserAgentCookieName } from "../../../../../commons/utils/constants.js";
import { authorizeErrors } from "../../../utils/authorizeErrors.js";

export const checkSameUserAgent = async (
  request: FastifyRequest,
  reply: FastifyReply,
  requestJws: string,
  clientId: string,
  redirectUri: string,
  state?: string,
) => {
  const cookie = request.cookies[checkUserAgentCookieName];

  if (!cookie) {
    logger.warn("Cookie for checking user agent not set", {
      client_id: clientId,
    });
    metrics.addMetric("CookieForCheckingUserAgentNotSet", MetricUnit.Count, 1);
    return new ErrorResponse(
      getRedirectToClientRedirectUriResponse(
        reply,
        redirectUri,
        authorizeErrors.cookieForCheckingUserAgentNotSet,
        state,
      ),
    );
  }

  const hash = createHash("sha256").update(requestJws).digest("hex");

  if (hash !== cookie) {
    logger.warn("User agent mismatch", {
      client_id: clientId,
      received_hash: cookie,
      calculated_hash: hash,
    });
    metrics.addMetric("UserAgentMismatch", MetricUnit.Count, 1);
    return new ErrorResponse(
      getRedirectToClientRedirectUriResponse(
        reply,
        redirectUri,
        authorizeErrors.userAgentMismatch,
        state,
      ),
    );
  }

  return true;
};
