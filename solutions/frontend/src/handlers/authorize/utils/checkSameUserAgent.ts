import { logger } from "../../../../../commons/utils/logger/index.js";
import {
  addAuthorizeErrorMetric,
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
    addAuthorizeErrorMetric("CookieForCheckingUserAgentNotSet");
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
    addAuthorizeErrorMetric("UserAgentMismatch");
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
