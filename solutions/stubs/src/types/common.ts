export enum HttpCodesEnum {
  BAD_REQUEST = 400,
}

export enum Algorithms {
  EC = "ES256",
  RSA = "RS256",
  NONE = "none",
  INVALID = "AB123",
}

export enum MockRequestObjectScenarios {
  VALID = "valid",
  INVALID_ALGORITHM = "invalidAlg",
  NONE_ALGORITHM = "noneAlg",
  MISSING_KID = "missingKid",
  WRONG_KID = "wrongKid",
  EXPIRED = "expired",
  IAT_IN_FUTURE = "iatInFuture",
}

export enum Scope {
  ACCOUNT_DELETION = "account-delete",
  UNKNOWN = "am-unknown",
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

type AlgType = Record<SignatureTypes, Algorithms>;

export interface JwtHeader {
  alg: Algorithms;
  typ?: string;
  kid?: string;

  [propName: string]: unknown;
}

export interface RequestBody {
  iss: string;
  client_id: string;
  client_secret?: string;
  aud?: string;
  response_type?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  jti: string;
  iat?: string;
  exp?: string;
  access_token?: string;
  refresh_token?: string;
  sub?: string;
  email?: string;
  govuk_signin_journey_id?: string;
  scenario?: string;
  [key: string]: unknown;
}

export enum Users {
  DEFAULT = "default",
  NON_EXISTENT = "non_existent",
}

interface User {
  sub: string;
  email: string;
}

export const getUsers = (user: string): User => {
  if (user === "non_existent") {
    return { sub: "", email: "" };
  } else {
    return {
      sub: "urn:fdc:gov.uk:default",
      email: "someone@example.com",
    };
  }
};

export const ALG: AlgType = { EC: Algorithms.EC, RSA: Algorithms.RSA };
export const DEFAULT_SCENARIO = MockRequestObjectScenarios.VALID;
export const DEFAULT_TOKEN_EXPIRY = 5;
export const DEFAULT_TOKEN_INITIATED_AT = 0;
export const MILLISECONDS_IN_MINUTES = 60_000;
export const CONVERT_TO_SECONDS = 1000;
