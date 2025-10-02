import { AUTHENTICATION_ISSUER } from "../utils/app-config.js";
import { JwtAdapter } from "../utils/jwt-adapter.js";
import { CustomError } from "../utils/errors.js";
import {
  Algorithms,
  CONVERT_TO_SECONDS,
  DEFAULT_SCENARIO,
  DEFAULT_TOKEN_EXPIRY,
  DEFAULT_TOKEN_INITIATED_AT,
  HttpCodesEnum,
  Kids,
  MILLISECONDS_IN_MINUTES,
  Scenarios,
  Scope,
  SignatureTypes,
} from "../types/common.js";
import logger from "../utils/logger.js";
import type { JWTPayload } from "jose";
import type { JwtHeader, RequestBody } from "../types/token.js";

export const generateJwtToken = async (
  requestBody: RequestBody,
  scenario: Scenarios,
): Promise<string> => {
  const jwtHeader = getJwtHeader(scenario);
  const jwtPayload = getJwtPayload(scenario, requestBody);

  logger.debug("token header & payload", { jwtHeader, jwtPayload });

  const token = await generateToken(jwtHeader, jwtPayload);
  if (!token) {
    throw new CustomError(HttpCodesEnum.BAD_REQUEST, "Token not generated");
  }
  return token;
};

export function getScenario(body: RequestBody): Scenarios {
  const retrievedScenario = Object.values(Scenarios).find(
    (scenario): scenario is Scenarios =>
      scenario === (body.scenario as Scenarios),
  );
  return retrievedScenario ?? DEFAULT_SCENARIO;
}

export function getJwtHeader(scenario: Scenarios): JwtHeader {
  let alg: Algorithms = Algorithms.EC;
  let kid: Kids | undefined = Kids.EC;
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
  header.typ = "JWT";
  if (kid) header.kid = kid;
  return header;
}

export function getJwtPayload(
  scenario: Scenarios,
  body: string | RequestBody,
): JWTPayload {
  let bodyPayload: JWTPayload = {};
  try {
    bodyPayload =
      typeof body === "string"
        ? (JSON.parse(body) as Record<string, unknown>)
        : body;
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
    iat: bodyIat,
    scope: bodyScope,
    ttl,
    ...payload
  } = bodyPayload;

  const expiresIn = typeof ttl === "number" ? ttl : DEFAULT_TOKEN_EXPIRY;
  const initiatedAt =
    typeof bodyIat === "number" ? bodyIat * -1 : DEFAULT_TOKEN_INITIATED_AT;
  const exp =
    scenario === Scenarios.EXPIRED ? getDateEpoch(-5) : getDateEpoch(expiresIn);
  const iat =
    scenario === Scenarios.IAT_IN_FUTURE
      ? getDateEpoch(5)
      : getDateEpoch(initiatedAt);
  const iss = AUTHENTICATION_ISSUER;
  const aud = bodyAud ?? process.env["DEFAULT_AUDIENCE"];
  const scope = bodyScope ?? Scope.REVERIFICATION;

  return {
    ...payload,
    exp,
    iat,
    iss,
    scope,
    ...(aud ? { aud } : {}),
  } as JWTPayload;
}

async function generateToken(
  header: JwtHeader,
  payload: JWTPayload,
): Promise<string> {
  try {
    const jwtAdapter = new JwtAdapter();
    return await jwtAdapter.sign(header, payload, SignatureTypes.EC);
  } catch (error) {
    logger.error("Failed to sign the token", { error });
    throw new CustomError(HttpCodesEnum.BAD_REQUEST, "Failed to sign token");
  }
}

function getDateEpoch(minutes: number) {
  return Math.floor(
    (Date.now() + minutes * MILLISECONDS_IN_MINUTES) / CONVERT_TO_SECONDS,
  );
}
