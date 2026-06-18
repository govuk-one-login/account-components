import { logger } from "../../../../../commons/utils/logger/index.js";
import {
  addAuthorizeErrorMetric,
  ErrorResponse,
  getRedirectToClientRedirectUriResponse,
} from "./common.js";
import type { getClaimsSchema } from "../../../utils/getClaimsSchema.js";
import type * as v from "valibot";
import { authorizeErrors } from "../../../utils/authorizeErrors.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { decodeJwt } from "jose";
import { initialJourneyPaths } from "../../../utils/paths.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  getCommonAuditEventProps,
  sendAuditEvent,
} from "../../../../../commons/utils/auditEvents/index.js";
import { createEvent } from "@govuk-one-login/event-catalogue-utils";
import { getAppConfig } from "../../../../../commons/utils/getAppConfig/index.js";

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
    request.session.expires = sessionExpiry;

    metrics.addDimensions({
      client_id: claims.client_id,
      scope: claims.scope,
    });
    metrics.addMetric("JourneyStarted", MetricUnit.Count, 1);

    if (request.awsLambda?.event) {
      const commonAuditEventProps = getCommonAuditEventProps(
        request.awsLambda.event,
      );

      const appConfig = await getAppConfig();

      await sendAuditEvent(
        createEvent("AMC_STARTED", {
          ...commonAuditEventProps,
          event_name: "AMC_STARTED",
          client_id: claims.client_id,
          extensions: {
            // @ts-expect-error - scope in event catalogue does not accommodate scopes: account-delete
            amc_scope: claims.scope,
            "journey-type": appConfig.client_registry.find(
              (client) => client.client_id === claims.client_id,
            )?.journey_types_by_scope?.[claims.scope],
          },
          user: {
            ...commonAuditEventProps.user,
            email: claims.email,
            user_id: claims.sub,
          },
        }),
      );
    }

    return await reply.redirect(initialJourneyPaths[claims.scope]);
  } catch (error) {
    logger.warn("FailedToStartSessionAndGoToJourney", {
      client_id: clientId,
      error,
    });
    addAuthorizeErrorMetric("FailedToStartSessionAndGoToJourney");
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
