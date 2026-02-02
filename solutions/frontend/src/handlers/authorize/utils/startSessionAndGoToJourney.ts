import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  ErrorResponse,
  getRedirectToClientRedirectUriResponse,
} from "./common.js";
import type { getClaimsSchema } from "../../../utils/getClaimsSchema.js";
import type * as v from "valibot";
import { authorizeErrors } from "../../../utils/authorizeErrors.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { decodeJwt } from "jose";
import { initialJourneyPaths } from "../../../utils/paths.js";

export const startSessionAndGoToJourney = async (
  reply: FastifyReply,
  request: FastifyRequest,
  claims: v.InferOutput<ReturnType<typeof getClaimsSchema>>,
  clientId: string,
  redirectUri: string,
  state?: string,
) => {
  try {
    await request.session.regenerate();

    const now = Math.floor(Date.now() / 1000);
    let sessionExpiry = now + 1800; // Default session length of 30 mins

    const accountManagementApiAccessTokenExpiry =
      claims.account_management_api_access_token
        ? decodeJwt(claims.account_management_api_access_token).exp
        : undefined;

    const accountDataApiAccessTokenExpiry = claims.account_data_api_access_token
      ? decodeJwt(claims.account_data_api_access_token).exp
      : undefined;

    const tokenExpiries = [
      accountManagementApiAccessTokenExpiry,
      accountDataApiAccessTokenExpiry,
    ].filter((item) => typeof item === "number");

    if (tokenExpiries.length) {
      sessionExpiry = Math.min(
        now + 7200, // Max session length of 2 hours
        ...tokenExpiries,
      );
    }

    request.session.claims = claims;
    request.session.user_id = claims.sub;
    request.session.expires = sessionExpiry;

    return await reply.redirect(initialJourneyPaths[claims.scope]);
  } catch (error) {
    logger.warn("FailedToStartSessionAndGoToJourney", {
      client_id: clientId,
      error,
    });
    metrics.addMetric(
      "FailedToStartSessionAndGoToJourney",
      MetricUnit.Count,
      1,
    );
    return new ErrorResponse(
      getRedirectToClientRedirectUriResponse(
        reply,
        redirectUri,
        authorizeErrors.failedToStartSessionAndGoToJourney,
        state,
      ),
    );
  }
};
