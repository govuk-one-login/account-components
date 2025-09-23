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

export enum Scenarios {
  VALID = "valid",
  INVALID_ALGORITHM = "invalidAlg",
  NONE_ALGORITHM = "noneAlg",
  MISSING_KID = "missingKid",
  WRONG_KID = "wrongKid",
  EXPIRED = "expired",
  IAT_IN_FUTURE = "iatInFuture",
  AUTH_ISS = "authIss",
}

export enum Scope {
  REVERIFICATION = "reverification",
  PROVING = "proving",
}

export enum SignatureTypes {
  EC = "EC",
  RSA = "RSA",
}

export enum Kids {
  AUTH_EC = "AuthEcKid123",
  AUTH_RSA = "AuthRsaKid123",
  EC = "ecKid123",
  RSA = "rsaKid123",
  WRONG = "wrongKid123",
}

export const ALG: AlgType = { EC: Algorithms.EC, RSA: Algorithms.RSA };
export const DEFAULT_SIGNATURE_TYPE = SignatureTypes.EC;
export const DEFAULT_SCENARIO = Scenarios.VALID;
export const DEFAULT_TOKEN_EXPIRY = 5;
export const DEFAULT_TOKEN_INITIATED_AT = 0;
export const MILLISECONDS_IN_MINUTES = 60_000;
export const CONVERT_TO_SECONDS = 1000;
