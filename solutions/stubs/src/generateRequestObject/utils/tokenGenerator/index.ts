import { JwtAdapter } from "../../../utils/jwt-adapter.js";
import { CustomError } from "../../../utils/errors.js";
import type {
  AuthorizeRequestObject,
  JwtHeader,
} from "../../../types/common.js";
import {
  Algorithms,
  Channels,
  CONVERT_TO_SECONDS,
  DEFAULT_SCENARIO,
  DEFAULT_TOKEN_EXPIRY,
  DEFAULT_TOKEN_INITIATED_AT,
  getUsers,
  HttpCodesEnum,
  Kids,
  MILLISECONDS_IN_MINUTES,
  MockRequestObjectScenarios,
  Scope,
  SignatureTypes,
} from "../../../types/common.js";
import { logger } from "../../../../../commons/utils/logger/index.js";
import type { JWTPayload } from "jose";
import { randomBytes } from "node:crypto";
import assert from "node:assert";

interface GenerateJwtTokenResponse {
  token: string;
  jwtPayload: JWTPayload;
  jwtHeader: JwtHeader;
}

export const generateJwtToken = async (
  authorizeRequestObject: AuthorizeRequestObject,
  scenario: MockRequestObjectScenarios,
): Promise<GenerateJwtTokenResponse> => {
  const alg = getAlgorithm(authorizeRequestObject);
  const jwtHeader = getJwtHeader(scenario, alg);
  const jwtPayload = getJwtPayload(scenario, authorizeRequestObject);

  logger.debug("token header & payload", { jwtHeader, jwtPayload });

  const token = await generateToken(jwtHeader, jwtPayload, alg);
  if (!token) {
    throw new CustomError(HttpCodesEnum.BAD_REQUEST, "Token not generated");
  }
  return { token, jwtPayload, jwtHeader };
};

export function getScenario(
  body: AuthorizeRequestObject,
): MockRequestObjectScenarios {
  const retrievedScenario = Object.values(MockRequestObjectScenarios).find(
    (scenario): scenario is MockRequestObjectScenarios =>
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      scenario === (body.scenario as MockRequestObjectScenarios),
  );
  delete body.scenario;
  return retrievedScenario ?? DEFAULT_SCENARIO;
}

export function getAlgorithm(body: AuthorizeRequestObject): Algorithms {
  const retrievedAlg = Object.values(Algorithms).find(
    (alg): alg is Algorithms => alg === body.algorithm,
  );
  delete body.algorithm;
  return retrievedAlg ?? Algorithms.EC;
}

export function getJwtHeader(
  scenario: MockRequestObjectScenarios,
  alg: Algorithms,
): JwtHeader {
  let kid: string | undefined;
  switch (alg) {
    case Algorithms.EC: {
      kid = Kids.EC;
      break;
    }
    case Algorithms.RSA: {
      kid = Kids.RSA;
      break;
    }
  }
  switch (scenario) {
    case MockRequestObjectScenarios.MISSING_KID: {
      kid = undefined;
      break;
    }
    case MockRequestObjectScenarios.WRONG_KID: {
      kid = Kids.WRONG;
      break;
    }
  }

  const header: JwtHeader = { typ: "JWT", alg };
  if (kid) header.kid = kid;
  return header;
}

const getRequestObjectBuilderOptions = (
  body: string | AuthorizeRequestObject,
) => {
  try {
    const requestObjectOptions: JWTPayload =
      typeof body === "string"
        ? // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          (JSON.parse(body) as Record<string, unknown>)
        : body;
    logger.debug("Request Object Options", { requestObjectOptions });
    return requestObjectOptions;
  } catch (error) {
    logger.error("Event body cannot be parsed", { error });
    throw new CustomError(
      HttpCodesEnum.BAD_REQUEST,
      "Event body is not valid JSON so cannot be parsed",
    );
  }
};

export function getJwtPayload(
  scenario: MockRequestObjectScenarios,
  body: string | AuthorizeRequestObject,
): JWTPayload {
  const requestObjectOptions = getRequestObjectBuilderOptions(body);
  const {
    aud: bodyAud,
    iat: bodyIat,
    scope: bodyScope,
    exp: bodyExp,
    iss: bodyIss,
    user_email_address: bodyUserEmailAddress,
    channel: bodyChannel,
    ...payload
  } = requestObjectOptions;

  assert.ok(process.env["DEFAULT_AUDIENCE"], "DEFAULT_AUDIENCE is not set");

  // have to multiply by 1 otherwise get unable to sign
  const expiresIn = bodyExp ? bodyExp * 1 : DEFAULT_TOKEN_EXPIRY * 60;
  delete payload["exp"];
  const initiatedAt = bodyIat ? bodyIat * -1 : DEFAULT_TOKEN_INITIATED_AT;
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const user = getUsers(requestObjectOptions["user"] as string);
  delete payload["user"];
  const iss =
    bodyIss && bodyIss.length > 0
      ? bodyIss
      : // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (requestObjectOptions["client_id"] as string);
  const userEmailAddress =
    typeof bodyUserEmailAddress === "string" && bodyUserEmailAddress.length > 0
      ? bodyUserEmailAddress
      : user.email;
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    ...payload,
    aud: bodyAud ?? process.env["DEFAULT_AUDIENCE"],
    response_type: "code",
    scope: bodyScope ?? Scope.ACCOUNT_DELETION,
    channel: (bodyChannel === "" ? Channels.Web : bodyChannel) ?? Channels.Web,
    state:
      typeof requestObjectOptions["state"] === "string" &&
      requestObjectOptions["state"].length > 0
        ? requestObjectOptions["state"]
        : Buffer.from(randomBytes(10)).toString("hex"),
    jti:
      requestObjectOptions.jti && requestObjectOptions.jti.length > 0
        ? requestObjectOptions.jti
        : Buffer.from(randomBytes(10)).toString("hex"),
    iat:
      scenario === MockRequestObjectScenarios.IAT_IN_FUTURE
        ? getDateEpoch(5)
        : getDateEpoch(initiatedAt),
    exp:
      scenario === MockRequestObjectScenarios.EXPIRED
        ? getDateEpoch(-5)
        : getDateEpoch(0) + expiresIn,
    iss,
    sub: user.sub,
    public_sub: user.public_sub,
    email: userEmailAddress,
  } as JWTPayload;
}

async function generateToken(
  header: JwtHeader,
  payload: JWTPayload,
  algorithm: Algorithms = Algorithms.EC,
): Promise<string> {
  try {
    const jwtAdapter = new JwtAdapter();
    const signatureType =
      algorithm === Algorithms.RSA ? SignatureTypes.RSA : SignatureTypes.EC;
    return await jwtAdapter.sign(header, payload, signatureType);
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
