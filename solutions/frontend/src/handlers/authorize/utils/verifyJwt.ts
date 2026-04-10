import * as v from "valibot";
import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import {
  addAuthorizeErrorMetric,
  ErrorResponse,
  getRedirectToClientRedirectUriResponse,
} from "./common.js";
import type { JWTPayload } from "jose";
import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader } from "jose";
import type { JWTExpired } from "jose/errors";
import { JOSEError } from "jose/errors";
import type { ClientEntry } from "../../../../../config/schema/types.js";
import { authorizeErrors } from "../../../utils/authorizeErrors.js";
import { getClaimsSchema } from "../../../utils/getClaimsSchema.js";
import assert from "node:assert";
import { getAppConfig } from "../../../../../commons/utils/getAppConfig/index.js";
import type { FastifyReply } from "fastify";
import { jwtVerifyAlgorithms } from "../../../../../commons/utils/constants.js";

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
      addAuthorizeErrorMetric("JWKSTimeout");
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
      addAuthorizeErrorMetric("JWKSInvalid");
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
      addAuthorizeErrorMetric("JWKSNoMatchingKey");
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
      addAuthorizeErrorMetric("JWKSMultipleMatchingKeys");
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
      addAuthorizeErrorMetric("JWKInvalid");
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
      addAuthorizeErrorMetric("JOSEAlgNotAllowed");
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
      addAuthorizeErrorMetric("JWSInvalid");
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
      addAuthorizeErrorMetric("JWSSignatureVerificationFailed");
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
      addAuthorizeErrorMetric("JWTInvalid");
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
      addAuthorizeErrorMetric("JWTExpired");
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
      addAuthorizeErrorMetric("JWTClaimValidationFailed");
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
        addAuthorizeErrorMetric("JOSEError");
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
      addAuthorizeErrorMetric("VerifyJwtUnknownError");
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
    // Check that kid is present in JWT header
    const header = decodeProtectedHeader(signedJwt);
    if (!header.kid) {
      logger.warn("JWTMissingKid");
      addAuthorizeErrorMetric("JWTMissingKid");
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.jwtInvalid,
          state,
        ),
      );
    }

    const jwks = createRemoteJWKSet(new URL(client.jwks_uri), {
      cacheMaxAge: appConfig.jwks_cache_max_age,
      timeoutDuration: appConfig.jwks_http_timeout,
    });

    payload = (
      await jwtVerify(signedJwt, jwks, {
        algorithms: jwtVerifyAlgorithms,
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
  scope: string,
  state?: string,
) => {
  const claimsSchema = getClaimsSchema(
    addAuthorizeErrorMetric,
    client,
    redirectUri,
    scope,
    state,
  );

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
    addAuthorizeErrorMetric("InvalidRequestObject");

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
  scope: string,
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
    scope,
    state,
  );

  return checkClaimsResult;
};
