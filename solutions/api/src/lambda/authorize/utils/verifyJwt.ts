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
import {
  JOSEAlgNotAllowed,
  JOSEError,
  JWKInvalid,
  JWKSInvalid,
  JWKSMultipleMatchingKeys,
  JWKSNoMatchingKey,
  JWKSTimeout,
  JWSInvalid,
  JWSSignatureVerificationFailed,
  JWTClaimValidationFailed,
  JWTExpired,
  JWTInvalid,
} from "jose/errors";
import { jwtSigningAlgorithm } from "../../../../../commons/utils/contstants.js";

const verifyJwtWithJose = async (
  signedJwt: string,
  client: Client,
  redirectUri: string,
  state?: string,
) => {
  let payload: JWTPayload | undefined = undefined;

  try {
    payload = (
      await jwtVerify(signedJwt, createRemoteJWKSet(new URL(client.jwks_uri)), {
        algorithms: [jwtSigningAlgorithm],
      })
    ).payload;
  } catch (error) {
    if (error instanceof JWKSTimeout) {
      logger.warn("JWKSTimeout", {
        client_id: client.client_id,
      });
      metrics.addMetric("JWKSTimeout", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.jwksTimeout,
          state,
        ),
      );
    } else if (error instanceof JWKSInvalid) {
      logger.warn("JWKSInvalid", {
        client_id: client.client_id,
      });
      metrics.addMetric("JWKSInvalid", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.jwksInvalid,
          state,
        ),
      );
    } else if (error instanceof JWKSNoMatchingKey) {
      logger.warn("JWKSNoMatchingKey", {
        client_id: client.client_id,
      });
      metrics.addMetric("JWKSNoMatchingKey", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.jwksNoMatchingKey,
          state,
        ),
      );
    } else if (error instanceof JWKSMultipleMatchingKeys) {
      logger.warn("JWKSMultipleMatchingKeys", {
        client_id: client.client_id,
      });
      metrics.addMetric("JWKSMultipleMatchingKeys", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.jwksMultipleMatchingKeys,
          state,
        ),
      );
    } else if (error instanceof JWKInvalid) {
      logger.warn("JWKInvalid", {
        client_id: client.client_id,
      });
      metrics.addMetric("JWKInvalid", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.jwkInvalid,
          state,
        ),
      );
    } else if (error instanceof JOSEAlgNotAllowed) {
      logger.warn("JOSEAlgNotAllowed", {
        client_id: client.client_id,
      });
      metrics.addMetric("JOSEAlgNotAllowed", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.algNotAllowed,
          state,
        ),
      );
    } else if (error instanceof JWSInvalid) {
      logger.warn("JWSInvalid", {
        client_id: client.client_id,
      });
      metrics.addMetric("JWSInvalid", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.jwsInvalid,
          state,
        ),
      );
    } else if (error instanceof JWSSignatureVerificationFailed) {
      logger.warn("JWSSignatureVerificationFailed", {
        client_id: client.client_id,
      });
      metrics.addMetric("JWSSignatureVerificationFailed", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.jwsSignatureVerificationFailed,
          state,
        ),
      );
    } else if (error instanceof JWTInvalid) {
      logger.warn("JWTInvalid", {
        client_id: client.client_id,
      });
      metrics.addMetric("JWTInvalid", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.jwtInvalid,
          state,
        ),
      );
    } else if (error instanceof JWTExpired) {
      logger.warn("JWTExpired", {
        client_id: client.client_id,
        exp: new Date(Number(error.payload.exp) * 1000).toISOString(),
        current_datetime: new Date().toISOString(),
        jose_error_code: error.code,
      });
      metrics.addMetric("JWTExpired", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.jwtExpired,
          state,
        ),
      );
    } else if (error instanceof JWTClaimValidationFailed) {
      logger.warn("JWTClaimValidationFailed", {
        client_id: client.client_id,
      });
      metrics.addMetric("JWTClaimValidationFailed", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.jwtClaimValidationFailed,
          state,
        ),
      );
    } else if (error instanceof JOSEError) {
      logger.warn("JOSEError", {
        client_id: client.client_id,
        jose_error_code: error.code,
      });
      metrics.addDimensions({ jose_error_code: error.code });
      metrics.addMetric("JOSEError", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.verifyJwtError,
          state,
        ),
      );
    } else {
      logger.warn("VerifyJwtUnknownError", {
        client_id: client.client_id,
      });
      metrics.addMetric("VerifyJwtUnknownError", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.verifyJwtUnknownError,
          state,
        ),
      );
    }
  }

  return payload;
};

const checkClaims = (
  payload: JWTPayload,
  client: Client,
  redirectUri: string,
  state?: string,
) => {
  const expectedResponseType = "code";

  assert.ok(
    process.env["AUTHORIZE_ENDPOINT_URL"],
    "AUTHORIZE_ENDPOINT_URL is not set",
  );

  const claimsSchema = v.object({
    client_id: v.literal(client.client_id, (issue) => {
      logger.warn("Client ID discrepancy", {
        client_id: client.client_id,
        expected_client_id: client.client_id,
        received_client_id: issue.received,
      });
      metrics.addMetric("ClientIdDiscrepancy", MetricUnit.Count, 1);
      return "";
    }),
    iss: v.literal(client.client_id, (issue) => {
      logger.warn("Issuer discrepancy", {
        client_id: client.client_id,
        expected_client_id: client.client_id,
        received_client_id: issue.received,
      });
      metrics.addMetric("IssuerDiscrepancy", MetricUnit.Count, 1);
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
    iat: v.pipe(
      v.number(),
      v.maxValue(Date.now() / 1000, (issue) => {
        logger.warn("iat is in the future", {
          client_id: client.client_id,
          iat: new Date(Number(issue.received) * 1000).toISOString(),
          current_datetime: new Date().toISOString(),
        });
        metrics.addMetric("IATInTheFuture", MetricUnit.Count, 1);
        return "";
      }),
    ),
    scope: v.picklist(client.scope.split(" "), (issue) => {
      logger.warn("Scope Denied", {
        client_id: client.client_id,
        allowed_scopes: client.scope,
        received_scope: issue.received,
      });
      metrics.addMetric("ScopeDenied", MetricUnit.Count, 1);
      return "";
    }),
    state: state === undefined ? v.undefined() : v.literal(state),
    jti: v.pipe(v.string(), v.nonEmpty()),
    access_token: v.pipe(v.string(), v.nonEmpty()),
    refresh_token: v.pipe(v.string(), v.nonEmpty()),
    sub: v.pipe(v.string(), v.nonEmpty()),
    email: v.pipe(v.string(), v.email()),
    govuk_signin_journey_id: v.pipe(v.string(), v.nonEmpty()),
  });

  const claimsResult = v.safeParse(claimsSchema, payload, {
    abortEarly: false,
  });

  if (!claimsResult.success) {
    logger.warn("InvalidRequestObject", {
      client_id: client.client_id,
      claims_with_issues: claimsResult.issues.map((issue) =>
        v.getDotPath(issue),
      ),
    });
    metrics.addMetric("InvalidRequestObject", MetricUnit.Count, 1);

    return new ErrorResponse(
      getRedirectToClientRedirectUriResponse(
        redirectUri,
        authorizeErrors.invalidClaims,
        state,
      ),
    );
  }

  return claimsResult.output;
};

export const verifyJwt = async (
  signedJwt: string,
  client: Client,
  redirectUri: string,
  state?: string,
) => {
  metrics.addDimensions({ client_id: client.client_id });

  const verifyJwtWithJoseResult = await verifyJwtWithJose(
    signedJwt,
    client,
    redirectUri,
    state,
  );

  if (verifyJwtWithJoseResult instanceof ErrorResponse) {
    return verifyJwtWithJoseResult;
  }

  const checkClaimsResult = checkClaims(
    verifyJwtWithJoseResult,
    client,
    redirectUri,
    state,
  );

  return checkClaimsResult;
};
