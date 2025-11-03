import * as v from "valibot";
import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  authorizeErrors,
  ErrorResponse,
  getRedirectToClientRedirectUriResponse,
} from "./common.js";
import type { JWTPayload } from "jose";
import { jwtVerify, createRemoteJWKSet } from "jose";
import type { Client } from "../../../../../commons/utils/getClientRegistry/index.js";
import assert from "node:assert";
import { JOSEError, JWTExpired } from "jose/errors";
import { Lang } from "../../../../../commons/utils/configureI18n/index.js";

const clientJwks: Record<string, ReturnType<typeof createRemoteJWKSet>> = {};

export const verifyJwt = async (
  signedJwt: string,
  client: Client,
  redirectUri: string,
  state?: string,
) => {
  metrics.addDimensions({ client_id: client.client_id });

  assert.ok(
    process.env["AUTHORIZE_ENDPOINT_URL"],
    "AUTHORIZE_ENDPOINT_URL is not set",
  );

  clientJwks[client.client_id] ??= createRemoteJWKSet(new URL(client.jwks_uri));
  const jwks = clientJwks[client.client_id];

  assert.ok(jwks, "JWKS not defined");

  const errorResponse = new ErrorResponse(
    getRedirectToClientRedirectUriResponse(
      redirectUri,
      authorizeErrors.jwtVerificationFailed,
      state,
    ),
  );

  let payload: JWTPayload | undefined = undefined;

  try {
    payload = (await jwtVerify(signedJwt, jwks)).payload;
  } catch (error) {
    if (error instanceof JWTExpired) {
      logger.warn("Request Object has Expired", {
        client_id: client.client_id,
        exp: new Date(Number(error.payload.exp) * 1000).toISOString(),
        current_datetime: new Date().toISOString(),
      });
      metrics.addMetric("ExpiredRequestObject", MetricUnit.Count, 1);
    } else if (error instanceof JOSEError) {
      logger.warn("Unable to verify JWT", {
        client_id: client.client_id,
        jose_error_code: error.code,
      });
      metrics.addDimensions({ jose_error_code: error.code });
      metrics.addMetric("UnableToVerifyJwt", MetricUnit.Count, 1);
    } else {
      logger.warn("Unknown error verifying JWT", {
        client_id: client.client_id,
      });
      metrics.addMetric("VerifyJwtUnknownError", MetricUnit.Count, 1);
    }

    return errorResponse;
  }

  const expectedResponseType = "code";

  const claimsSchema = v.object({
    client_id: v.literal(client.client_id, (issue) => {
      logger.warn("Client ID discrepancy", {
        client_id: client.client_id,
        expected_client_id: client.client_id,
        received_client_id: issue.received,
      });
      metrics.addMetric("ClientIdDescrepancy", MetricUnit.Count, 1);
      return "";
    }),
    iss: v.literal(client.client_id, (issue) => {
      logger.warn("Issuer discrepancy", {
        client_id: client.client_id,
        expected_client_id: client.client_id,
        received_client_id: issue.received,
      });
      metrics.addMetric("IssuerDescrepancy", MetricUnit.Count, 1);
      return "";
    }),
    aud: v.literal(process.env["AUTHORIZE_ENDPOINT_URL"], (issue) => {
      logger.warn("Unexpected Audience", {
        client_id: client.client_id,
        expected_aud: process.env["AUTHORIZE_ENDPOINT_URL"],
        received_aud: issue.received,
      });
      metrics.addMetric("UnexpectedAudience", MetricUnit.Count, 1);
      return "";
    }),
    response_type: v.literal(expectedResponseType, (issue) => {
      logger.warn("Unexpected Response Type", {
        client_id: client.client_id,
        expected_response_type: expectedResponseType,
        received_response_type: issue.received,
      });
      metrics.addMetric("UnexpectedResponseType", MetricUnit.Count, 1);
      return "";
    }),
    scope: v.picklist(client.scope.split(" "), (issue) => {
      logger.warn("Scope Denied", {
        client_id: client.client_id,
        allowed_scopes: client.scope,
        received_scope: issue.received,
      });
      metrics.addMetric("ScopeDenied", MetricUnit.Count, 1);
      return "";
    }),
    state: state !== undefined ? v.literal(state) : v.undefined(),
    jti: v.pipe(v.string(), v.nonEmpty()),
    access_token: v.pipe(v.string(), v.nonEmpty()),
    refresh_token: v.pipe(v.string(), v.nonEmpty()),
    sub: v.pipe(v.string(), v.nonEmpty()),
    email: v.pipe(v.string(), v.email()),
    govuk_signin_journey_id: v.pipe(v.string(), v.nonEmpty()),
    lng: v.optional(v.enum(Lang), Lang.English),
  });

  const claimsResult = v.safeParse(claimsSchema, payload, {
    abortEarly: false,
  });

  if (!claimsResult.success) {
    logger.warn("Invalid Request Object", {
      client_id: client.client_id,
      claims_with_issues: claimsResult.issues.map((issue) =>
        v.getDotPath(issue),
      ),
    });
    metrics.addMetric("InvalidRequestObject", MetricUnit.Count, 1);

    return errorResponse;
  }

  return claimsResult.output;
};
