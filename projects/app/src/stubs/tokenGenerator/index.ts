import {AUTHENTICATION_ISSUER, DEFAULT_AUDIENCE,} from "../utils/app-config.js";
import {JwtAdapter} from "../utils/jwt-adapter.js";
import {CustomError} from "../utils/errors.js";
import {
    ALG,
    Algorithms,
    CONVERT_TO_SECONDS,
    DEFAULT_SCENARIO,
    DEFAULT_SIGNATURE_TYPE,
    DEFAULT_TOKEN_EXPIRY,
    DEFAULT_TOKEN_INITIATED_AT,
    HttpCodesEnum,
    Kids,
    MILLISECONDS_IN_MINUTES,
    Scenarios,
    Scope,
    Scenario,
    SignatureTypes,
} from "../types/common.js";
import logger from "../utils/logger.js";
import type {JWTPayload} from "jose";
import type {JwtHeader, RequestBody} from "../types/token.js";
import type {FastifyRequest} from "fastify";

export const generateAccessToken = async (
    request: FastifyRequest, signatureAndScenario:Scenario
): Promise<string> => {

    const {signature, scenario} = signatureAndScenario;

    const jwtHeader = getJwtHeader(scenario, signature);
    const jwtPayload = getJwtPayload(scenario, request.body as string);

    logger.debug("token header & payload", {jwtHeader, jwtPayload});

    const token = await generateToken(jwtHeader, jwtPayload, signature);
    if (!token) {
        throw new CustomError(HttpCodesEnum.BAD_REQUEST, "Token not generated");
    }
    return token
};

export function getScenario(body: RequestBody): Scenarios {
    const retrievedScenario = Object.values(Scenarios).find(
        (scenario): scenario is Scenarios =>
            scenario === (body.scenario as Scenarios),
    );
    logger.info(`Retrieved scenario: ${retrievedScenario}`);
    const scenario: Scenarios = retrievedScenario ?? DEFAULT_SCENARIO;
    logger.info(`Actual scenario: ${scenario}`);
    return scenario;
}

function getJwtHeader(
    scenario: Scenarios,
    signatureType: SignatureTypes,
): JwtHeader {
    let alg: Algorithms = ALG[signatureType];
    let kid: string | undefined = signatureType === SignatureTypes.EC ? Kids.EC : Kids.RSA;
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

    const header: JwtHeader = {alg};
    header.typ = "JWT";
    if (kid) header.kid = kid;
    return header;
}

/**
 * A function for returning the JWT Payload.
 *
 * @param scenario - the types of scenario: valid, invalid, none-algorithm, missing-kid, expired, iat in future.
 * @param body - the body string.
 * @throws {@link CustomError} - if the event body is invalid JSON.
 */
function getJwtPayload(scenario: Scenarios, body: string | RequestBody): JWTPayload {
    let bodyPayload: JWTPayload = {};
    try {
        bodyPayload =
            typeof body === "string"
                ? (JSON.parse(body) as Record<string, unknown>)
                : body;
    } catch (error) {
        logger.error("Event body cannot be parsed", {error});
        throw new CustomError(
            HttpCodesEnum.BAD_REQUEST,
            "Event body is not valid JSON so cannot be parsed",
        );
    }

    logger.debug("payload values from request body", {bodyPayload});

    const {
        aud: bodyAud,
        iat: bodyIat,
        scope: bodyScope,
        ttl,
        ...payload
    } = bodyPayload;

    const expiresIn = typeof ttl === "number" ? ttl : DEFAULT_TOKEN_EXPIRY;
    const initiatedAt = typeof bodyIat === "number" ? bodyIat * -1 : DEFAULT_TOKEN_INITIATED_AT;
    const exp = scenario === Scenarios.EXPIRED ? getDateEpoch(-5) : getDateEpoch(expiresIn);
    const iat = scenario === Scenarios.IAT_IN_FUTURE ? getDateEpoch(5) : getDateEpoch(initiatedAt);
    const iss = AUTHENTICATION_ISSUER;
    const aud = bodyAud ?? DEFAULT_AUDIENCE;
    const scope = bodyScope ?? Scope.REVERIFICATION;

    return {
        ...payload,
        exp,
        iat,
        ...{iss},
        ...(aud && {aud}),
        ...{scope},
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
async function generateToken(header: JwtHeader, payload: JWTPayload, signatureType: SignatureTypes): Promise<string> {
    try {
        const jwtAdapter = new JwtAdapter();
        return await jwtAdapter.sign(header, payload, signatureType);
    } catch (error) {
        logger.error("Failed to sign the token", {error});
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
