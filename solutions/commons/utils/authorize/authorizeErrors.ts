interface AuthorizeErrorAccessDenied {
  description: `E1${number}`;
  type: "access_denied";
}
interface AuthorizeErrorInvalidRequest {
  description: `E2${number}`;
  type: "invalid_request";
}
interface AuthorizeErrorInvalidScope {
  description: `E3${number}`;
  type: "invalid_scope";
}
interface AuthorizeErrorUnauthorizedClient {
  description: `E4${number}`;
  type: "unauthorized_client";
}
interface AuthorizeErrorServerError {
  description: `E5${number}`;
  type: "server_error";
}

export const authorizeErrors = {
  // TODO remove this and it's use before going live
  tempErrorTODORemoveLater: {
    description: "E1000",
    type: "access_denied",
  },
  userAborted: {
    description: "E1001",
    type: "access_denied",
  },
  algNotAllowed: {
    description: "E2001",
    type: "invalid_request",
  },
  jwsInvalid: {
    description: "E2002",
    type: "invalid_request",
  },
  jwsSignatureVerificationFailed: {
    description: "E2003",
    type: "invalid_request",
  },
  jwtInvalid: {
    description: "E2004",
    type: "invalid_request",
  },
  jwtExpired: {
    description: "E2005",
    type: "invalid_request",
  },
  jwtClaimValidationFailed: {
    description: "E2006",
    type: "invalid_request",
  },
  verifyJwtError: {
    description: "E2007",
    type: "invalid_request",
  },
  invalidClaims: {
    description: "E2008",
    type: "invalid_request",
  },
  jarDecryptFailed: {
    description: "E2009",
    type: "invalid_request",
  },
  jtiAlreadyUsed: {
    description: "E2010",
    type: "invalid_request",
  },
  jwksTimeout: {
    description: "E4001",
    type: "unauthorized_client",
  },
  jwksInvalid: {
    description: "E4002",
    type: "unauthorized_client",
  },
  jwksNoMatchingKey: {
    description: "E4003",
    type: "unauthorized_client",
  },
  jwksMultipleMatchingKeys: {
    description: "E4004",
    type: "unauthorized_client",
  },
  jwkInvalid: {
    description: "E4005",
    type: "unauthorized_client",
  },
  failedToCheckJtiUnusedAndSetUpSession: {
    description: "E5001",
    type: "server_error",
  },
  verifyJwtUnknownError: {
    description: "E5002",
    type: "server_error",
  },
  jarDecryptUnknownError: {
    description: "E5003",
    type: "server_error",
  },
  failedToDeleteApiSession: {
    description: "E5004",
    type: "server_error",
  },
  failedToSaveOutcome: {
    description: "E5008",
    type: "server_error",
  },
  failedToCreateStateMachineActor: {
    description: "E5009",
    type: "server_error",
  },
  failedToValidateJourneyUrl: {
    description: "E5010",
    type: "server_error",
  },
  failedToCompleteJourney: {
    description: "E5011",
    type: "server_error",
  },
} as const satisfies Record<
  string,
  | AuthorizeErrorAccessDenied
  | AuthorizeErrorInvalidRequest
  | AuthorizeErrorInvalidScope
  | AuthorizeErrorUnauthorizedClient
  | AuthorizeErrorServerError
>;
