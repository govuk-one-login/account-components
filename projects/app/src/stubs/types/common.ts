import type {AlgType} from "./token.js";

interface RPConfig {
    authCallbackUrl(): string;
}

interface OidcClient {
    buildJarAuthorizeRequest(
        callbackUrl: string,
        vtr: string[],
        scopes: string[],
        claimsSetRequest: ClaimsSetRequest,
        language: string,
        prompt: string,
        rpSid: string,
        idToken: string,
        maxAge: string,
        codeChallengeMethod: CodeChallengeMethod,
        codeVerifier: CodeVerifier,
        loginHint: string,
        channel: string
    ): AuthenticationRequest;
}

interface ClaimsSetRequest {
}

type CodeChallengeMethod = 'plain' | 'S256';
type CodeVerifier = string;

interface AuthenticationRequest {
}

export enum HttpCodesEnum {
    OK = 200,
    CREATED = 201,
    ACCEPTED = 202,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
}

export enum Algorithms {
    EC = 'ES256',
    RSA = 'RS256',
    NONE = 'none',
    INVALID = 'AB123',
}

export enum SigningAlgorithms {
    EC = 'ECDSA_SHA_256',
    RSA = 'RSASSA_PKCS1_V1_5_SHA_256',
}

export enum Scenarios {
    VALID = 'valid',
    INVALID_ALGORITHM = 'invalidAlg',
    NONE_ALGORITHM = 'noneAlg',
    MISSING_KID = 'missingKid',
    WRONG_KID = 'wrongKid',
    EXPIRED = 'expired',
    IAT_IN_FUTURE = 'iatInFuture',
    AUTH_ISS = 'authIss',
}

export enum Scope {
    REVERIFICATION = 'reverification',
    PROVING = 'proving',
}

export enum SignatureTypes {
    EC = 'EC',
    RSA = 'RSA',
}

export enum Kids {
    AUTH_EC = 'AuthEcKid123',
    AUTH_RSA = 'AuthRsaKid123',
    EC = 'ecKid123',
    RSA = 'rsaKid123',
    WRONG = 'wrongKid123',
}

export const ALG: AlgType = { EC: Algorithms.EC, RSA: Algorithms.RSA };
export const REGION = 'eu-west-2';
export const DEFAULT_SIGNATURE_TYPE = SignatureTypes.EC;
export const DEFAULT_SCENARIO = Scenarios.VALID;
export const DEFAULT_TOKEN_EXPIRY = 5;
export const DEFAULT_TOKEN_INITIATED_AT = 0;
export const JWKS_TIMEOUT_MILLISECONDS = 31_000;
export const MILLISECONDS_IN_MINUTES = 60_000;
export const CONVERT_TO_SECONDS = 1000;