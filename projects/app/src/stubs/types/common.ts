import type { AlgType } from "./token.js";

export enum HttpCodesEnum {
  BAD_REQUEST = 400,
}

export enum Algorithms {
  EC = "ES256",
  RSA = "RS256",
  NONE = "none",
  INVALID = "AB123",
}

export enum JWEAlgorithms {
  EC = "ECDH-ES+A256KW",
  RSA = "RSA-OAEP-256",
  INVALID = "AB123",
}

export enum Scenarios {
  VALID = "valid",
  INVALID_ALGORITHM = "invalidAlg",
  NONE_ALGORITHM = "noneAlg",
  MISSING_KID = "missingKid",
  WRONG_KID = "wrongKid",
  EXPIRED = "expired",
  IAT_IN_FUTURE = "iatInFuture",
}

export enum Scope {
  REVERIFICATION = "reverification",
}

export enum SignatureTypes {
  EC = "EC",
  RSA = "RSA",
}

export enum Kids {
  EC = "ecKid123",
  RSA = "rsaKid123",
  WRONG = "wrongKid123",
}

export type Scenario = {
    signature: SignatureTypes;
    scenario: Scenarios;
}

export interface JwksKeyType {
  kty: SignatureTypes;
  alg: Algorithms;
  kid: string;
  jweAlg: JWEAlgorithms;
}

export const JWKS_KEY_TYPES: JwksKeyType[] = [
  { kty: SignatureTypes.EC, alg: Algorithms.EC, kid: Kids.EC, jweAlg: JWEAlgorithms.EC },
  { kty: SignatureTypes.RSA, alg: Algorithms.RSA, kid: Kids.RSA, jweAlg: JWEAlgorithms.RSA },
];

export const ALG: AlgType = { EC: Algorithms.EC, RSA: Algorithms.RSA };
export const DEFAULT_SIGNATURE_TYPE = SignatureTypes.RSA;
export const DEFAULT_SCENARIO = Scenarios.VALID;
export const DEFAULT_TOKEN_EXPIRY = 5;
export const DEFAULT_TOKEN_INITIATED_AT = 0;
export const MILLISECONDS_IN_MINUTES = 60_000;
export const CONVERT_TO_SECONDS = 1000;
export const JWKS_TIMEOUT_MILLISECONDS = 31_000;
