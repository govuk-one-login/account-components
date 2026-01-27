interface AuthorizeErrorInvalidRequest {
  description: `E1${number}`;
  type: "invalid_request";
}
interface AuthorizeErrorUnauthorizedClient {
  description: `E2${number}`;
  type: "unauthorized_client";
}
interface AuthorizeErrorServerError {
  description: `E3${number}`;
  type: "server_error";
}

export const authorizeErrors = {
  algNotAllowed: {
    description: "E1001",
    type: "invalid_request",
  },
  jwsInvalid: {
    description: "E1002",
    type: "invalid_request",
  },
  jwsSignatureVerificationFailed: {
    description: "E1003",
    type: "invalid_request",
  },
  jwtInvalid: {
    description: "E1004",
    type: "invalid_request",
  },
  jwtExpired: {
    description: "E1005",
    type: "invalid_request",
  },
  jwtClaimValidationFailed: {
    description: "E1006",
    type: "invalid_request",
  },
  verifyJwtError: {
    description: "E1007",
    type: "invalid_request",
  },
  invalidClaims: {
    description: "E1008",
    type: "invalid_request",
  },
  jarDecryptFailed: {
    description: "E1009",
    type: "invalid_request",
  },
  jtiAlreadyUsed: {
    description: "E1010",
    type: "invalid_request",
  },
  jwksTimeout: {
    description: "E2001",
    type: "unauthorized_client",
  },
  jwksInvalid: {
    description: "E2002",
    type: "unauthorized_client",
  },
  jwksNoMatchingKey: {
    description: "E2003",
    type: "unauthorized_client",
  },
  jwksMultipleMatchingKeys: {
    description: "E2004",
    type: "unauthorized_client",
  },
  jwkInvalid: {
    description: "E2005",
    type: "unauthorized_client",
  },
  failedToCheckJtiUnusedAndSetUpSession: {
    description: "E3001",
    type: "server_error",
  },
  verifyJwtUnknownError: {
    description: "E3002",
    type: "server_error",
  },
  jarDecryptUnknownError: {
    description: "E3003",
    type: "server_error",
  },
} as const satisfies Record<
  string,
  | AuthorizeErrorInvalidRequest
  | AuthorizeErrorUnauthorizedClient
  | AuthorizeErrorServerError
>;
