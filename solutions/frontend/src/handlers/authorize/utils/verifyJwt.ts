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
import type { JWTExpired } from "jose/errors";
import { JOSEError } from "jose/errors";
import { jwtSigningAlgorithm } from "../../../../../commons/utils/constants.js";
import type { ClientEntry } from "../../../../../config/schema/types.js";
import { authorizeErrors } from "../../../utils/authorizeErrors.js";
import { getClaimsSchema } from "../../../utils/getClaimsSchema.js";
import assert from "node:assert";
import { getAppConfig } from "../../../../../commons/utils/getAppConfig/index.js";
import type { FastifyReply } from "fastify";

const handleJwtError = (
  reply: FastifyReply,
  error: unknown,
  client: ClientEntry,
  redirectUri: string,
  state?: string,
) => {
  assert.ok(error instanceof Error);
  const errorName = error.constructor.name;

  switch (errorName) {
    case "JWKSTimeout":
      logger.warn("JWKSTimeout", { client_id: client.client_id });
      metrics.addMetric("JWKSTimeout", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.jwksTimeout,
          state,
        ),
      );

    case "JWKSInvalid":
      logger.warn("JWKSInvalid", { client_id: client.client_id });
      metrics.addMetric("JWKSInvalid", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.jwksInvalid,
          state,
        ),
      );

    case "JWKSNoMatchingKey":
      logger.warn("JWKSNoMatchingKey", { client_id: client.client_id });
      metrics.addMetric("JWKSNoMatchingKey", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.jwksNoMatchingKey,
          state,
        ),
      );

    case "JWKSMultipleMatchingKeys":
      logger.warn("JWKSMultipleMatchingKeys", { client_id: client.client_id });
      metrics.addMetric("JWKSMultipleMatchingKeys", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.jwksMultipleMatchingKeys,
          state,
        ),
      );

    case "JWKInvalid":
      logger.warn("JWKInvalid", { client_id: client.client_id });
      metrics.addMetric("JWKInvalid", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.jwkInvalid,
          state,
        ),
      );

    case "JOSEAlgNotAllowed":
      logger.warn("JOSEAlgNotAllowed", { client_id: client.client_id });
      metrics.addMetric("JOSEAlgNotAllowed", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.algNotAllowed,
          state,
        ),
      );

    case "JWSInvalid":
      logger.warn("JWSInvalid", { client_id: client.client_id });
      metrics.addMetric("JWSInvalid", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.jwsInvalid,
          state,
        ),
      );

    case "JWSSignatureVerificationFailed":
      logger.warn("JWSSignatureVerificationFailed", {
        client_id: client.client_id,
      });
      metrics.addMetric("JWSSignatureVerificationFailed", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.jwsSignatureVerificationFailed,
          state,
        ),
      );

    case "JWTInvalid":
      logger.warn("JWTInvalid", { client_id: client.client_id });
      metrics.addMetric("JWTInvalid", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.jwtInvalid,
          state,
        ),
      );

    case "JWTExpired": {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const expiredError = error as JWTExpired;
      logger.warn("JWTExpired", {
        client_id: client.client_id,
        exp: new Date(Number(expiredError.payload.exp) * 1000).toISOString(),
        current_datetime: new Date().toISOString(),
      });
      metrics.addMetric("JWTExpired", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.jwtExpired,
          state,
        ),
      );
    }

    case "JWTClaimValidationFailed":
      logger.warn("JWTClaimValidationFailed", { client_id: client.client_id });
      metrics.addMetric("JWTClaimValidationFailed", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.jwtClaimValidationFailed,
          state,
        ),
      );

    default:
      if (error instanceof JOSEError) {
        logger.warn("JOSEError", {
          client_id: client.client_id,
          jose_error_code: error.code,
          jose_error_message: error.message,
          jose_error_name: error.name,
          jose_error_cause: error.cause,
          jose_error_stack: error.stack,
        });
        metrics.addMetadata("jose_error_code", error.code);
        metrics.addMetric("JOSEError", MetricUnit.Count, 1);
        return new ErrorResponse(
          getRedirectToClientRedirectUriResponse(
            reply,
            redirectUri,
            authorizeErrors.verifyJwtError,
            state,
          ),
        );
      }

      logger.warn("VerifyJwtUnknownError", {
        client_id: client.client_id,
        error,
      });
      metrics.addMetric("VerifyJwtUnknownError", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.verifyJwtUnknownError,
          state,
        ),
      );
  }
};

const verify = async (
  reply: FastifyReply,
  signedJwt: string,
  client: ClientEntry,
  redirectUri: string,
  state?: string,
) => {
  let payload: JWTPayload;

  const appConfig = await getAppConfig();

  try {
    const jwks = createRemoteJWKSet(new URL(client.jwks_uri), {
      cacheMaxAge: appConfig.jwks_cache_max_age,
      timeoutDuration: appConfig.jwks_http_timeout,
    });

    payload = (
      await jwtVerify(signedJwt, jwks, {
        algorithms: [jwtSigningAlgorithm],
      })
    ).payload;
  } catch (error) {
    return handleJwtError(reply, error, client, redirectUri, state);
  }

  return payload;
};

const checkClaims = async (
  reply: FastifyReply,
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
        reply,
        redirectUri,
        authorizeErrors.invalidClaims,
        state,
      ),
    );
  }

  return claimsResult.output;
};

export const verifyJwt = async (
  reply: FastifyReply,
  signedJwt: string,
  client: ClientEntry,
  redirectUri: string,
  state?: string,
) => {
  const verifyResult = await verify(
    reply,
    signedJwt,
    client,
    redirectUri,
    state,
  );

  if (verifyResult instanceof ErrorResponse) {
    return verifyResult;
  }

  const checkClaimsResult = await checkClaims(
    reply,
    verifyResult,
    client,
    redirectUri,
    state,
  );

  return checkClaimsResult;
};
