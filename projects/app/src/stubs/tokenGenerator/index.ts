import {
  DEFAULT_ISSUER,
  DEFAULT_AUDIENCE,
  AUTHENTICATION_ISSUER,
} from "../utils/app-config.js";
import { JwtAdapter } from "../utils/jwt-adapter.js";
import { CustomError } from "../utils/errors.js";
import {
  ALG,
  Kids,
  DEFAULT_SIGNATURE_TYPE,
  DEFAULT_SCENARIO,
  DEFAULT_TOKEN_EXPIRY,
  DEFAULT_TOKEN_INITIATED_AT,
  MILLISECONDS_IN_MINUTES,
  CONVERT_TO_SECONDS,
  SignatureTypes,
  Algorithms,
  HttpCodesEnum,
  Scope,
} from "../types/common.js";
import logger from "../utils/logger.js";
import type { JWTPayload } from "jose";
import type { JwtHeader, RequestBody } from "../types/token.js";
import { Scenarios } from "../types/common.js";
import type { FastifyRequest } from "fastify";

export const generateAccessToken = async (
  request: FastifyRequest,
): Promise<string> => {
  const { signature, scenario } = getScenario(request.body as RequestBody);

  logger.debug("signature & scenario", { signature, scenario });

  const jwtHeader = getJwtHeader(scenario, signature);
  const jwtPayload = getJwtPayload(scenario, request.body as string);

  logger.debug("token header & payload", { jwtHeader, jwtPayload });

  const token = await generateToken(jwtHeader, jwtPayload, signature);

  if (!token) {
    throw new CustomError(HttpCodesEnum.BAD_REQUEST, "Token not generated");
  }
  return token;
};

function getScenario(body: RequestBody): {
  signature: SignatureTypes;
  scenario: Scenarios;
} {
  const scenarioString = body.scenario;
  const signatureTypeString = body.signatureType;

  const scenario: Scenarios =
    Object.values(Scenarios).find(
      (validScenario): validScenario is Scenarios =>
        validScenario === (scenarioString as Scenarios),
    ) ?? DEFAULT_SCENARIO;
  const signature: SignatureTypes =
    Object.values(SignatureTypes).find(
      (validType): validType is SignatureTypes =>
        validType === (signatureTypeString as SignatureTypes),
    ) ?? DEFAULT_SIGNATURE_TYPE;
  return { signature, scenario };
}

function getJwtHeader(
  scenario: Scenarios,
  signatureType: SignatureTypes,
): JwtHeader {
  const typ = "JWT";
  let alg: Algorithms = ALG[signatureType];
  let kid: string | undefined =
    scenario == Scenarios.AUTH_ISS
      ? signatureType === SignatureTypes.EC
        ? Kids.AUTH_EC
        : Kids.AUTH_RSA
      : signatureType === SignatureTypes.EC
        ? Kids.EC
        : Kids.RSA;
  switch (scenario) {
    case Scenarios.INVALID_ALGORITHM: {
      alg = Algorithms.INVALID;
      break;
    }
    case Scenarios.NONE_ALGORITHM: {
      alg = Algorithms.NONE;
      break;
    }
    case Scenarios.MISSING_KID: {
      kid = undefined;
      break;
    }
    case Scenarios.WRONG_KID: {
      kid = Kids.WRONG;
      break;
    }
  }

  const header: JwtHeader = { alg };
  header.typ = typ;
  if (kid) header.kid = kid;
  return header;
}

/**
 * A function for returning the JWT Payload.
 *
 * @param tokenType - the types of token: valid, invalid, none-algorithm, missing-kid, expired, iat in future.
 * @param body - the body string.
 * @throws {@link CustomError} - if the event body is invalid JSON.
 */
function getJwtPayload(tokenType: Scenarios, body: string | null): JWTPayload {
  let bodyPayload: JWTPayload = {};
  try {
    bodyPayload =
      typeof body === "string"
        ? (JSON.parse(body) as Record<string, unknown>)
        : {};
  } catch (error) {
    logger.error("Event body cannot be parsed", { error });
    throw new CustomError(
      HttpCodesEnum.BAD_REQUEST,
      "Event body is not valid JSON so cannot be parsed",
    );
  }

  logger.debug("payload values from request body", { bodyPayload });

  const {
    aud: bodyAud,
    iss: bodyIss,
    iat: bodyIat,
    scope: bodyScope,
    ttl,
    ...payload
  } = bodyPayload;

  const expiresIn = typeof ttl === "number" ? ttl : DEFAULT_TOKEN_EXPIRY;
  const initiatedAt =
    typeof bodyIat === "number" ? bodyIat * -1 : DEFAULT_TOKEN_INITIATED_AT;
  const exp =
    tokenType === Scenarios.EXPIRED
      ? getDateEpoch(-5)
      : getDateEpoch(expiresIn);
  const iat =
    tokenType === Scenarios.IAT_IN_FUTURE
      ? getDateEpoch(5)
      : getDateEpoch(initiatedAt);
  const iss =
    tokenType === Scenarios.AUTH_ISS
      ? AUTHENTICATION_ISSUER
      : (bodyIss ?? DEFAULT_ISSUER);
  const aud = bodyAud ?? DEFAULT_AUDIENCE;
  const scope =
    bodyScope ??
    (iss === AUTHENTICATION_ISSUER ? Scope.REVERIFICATION : Scope.PROVING);

  return {
    ...payload,
    exp,
    iat,
    ...(iss && { iss }),
    ...(aud && { aud }),
    ...{ scope },
  } as JWTPayload;
}

/**
 * A function for returning the promise for generating the token.
 *
 * @param header - the JWT Header
 * @param payload - the JWT Payload.
 * @param signatureType - the signature types.
 * @throws {@link CustomError} - if the token could not be signed.
 */
async function generateToken(
  header: JwtHeader,
  payload: JWTPayload,
  signatureType: SignatureTypes,
): Promise<string> {
  try {
    const jwtAdapter = new JwtAdapter();
    const token = await jwtAdapter.sign(header, payload, signatureType);
    return token;
  } catch (error) {
    logger.error("Failed to sign the token", { error });
    throw new CustomError(HttpCodesEnum.BAD_REQUEST, "Failed to sign token");
  }
}

/**
 * A function for getting the Date in EPOCH format.
 *
 * @returns the epoch equivalent for the date.
 * @param minutes - minutes
 */
function getDateEpoch(minutes: number) {
  return Math.floor(
    (Date.now() + minutes * MILLISECONDS_IN_MINUTES) / CONVERT_TO_SECONDS,
  );
}
