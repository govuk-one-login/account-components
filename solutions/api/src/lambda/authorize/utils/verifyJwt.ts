import * as v from "valibot";
import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  ErrorResponse,
  getRedirectToClientRedirectUriResponse,
} from "./common.js";
import type { JWTPayload } from "jose";
import { jwtVerify, createRemoteJWKSet } from "jose";
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
import type { ClientEntry } from "../../../../../config/schema/types.js";
import { getClaimsSchema } from "./getClaimsSchema.js";
import { authorizeErrors } from "../../../../../commons/utils/authorize/index.js";

const verify = async (
  signedJwt: string,
  client: ClientEntry,
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
        jose_error_message: error.message,
        jose_error_name: error.name,
        jose_error_stack: error.stack,
        jose_error_cause: error.cause,
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

const checkClaims = async (
  payload: JWTPayload,
  client: ClientEntry,
  redirectUri: string,
  state?: string,
) => {
  const claimsSchema = getClaimsSchema(client, redirectUri, state);

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
  client: ClientEntry,
  redirectUri: string,
  state?: string,
) => {
  const verifyResult = await verify(signedJwt, client, redirectUri, state);

  if (verifyResult instanceof ErrorResponse) {
    return verifyResult;
  }

  const checkClaimsResult = await checkClaims(
    verifyResult,
    client,
    redirectUri,
    state,
  );

  return checkClaimsResult;
};
