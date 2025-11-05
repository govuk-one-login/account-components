import type { APIGatewayProxyResult } from "aws-lambda";
import assert from "node:assert";

assert.ok(
  process.env["AUTHORIZE_ERROR_PAGE_URL"],
  "AUTHORIZE_ERROR_PAGE_URL not set",
);

export class ErrorResponse {
  errorResponse: APIGatewayProxyResult;

  constructor(errorResponse: APIGatewayProxyResult) {
    this.errorResponse = errorResponse;
  }
}

export const badRequestResponse: APIGatewayProxyResult = {
  statusCode: 302,
  headers: {
    location: process.env["AUTHORIZE_ERROR_PAGE_URL"],
  },
  body: "",
};

interface AuthorizeErrorAccessDenied {
  code: `E1${number}`;
  description: "access_denied";
}
interface AuthorizeErrorInvalidRequest {
  code: `E2${number}`;
  description: "invalid_request";
}
interface AuthorizeErrorInvalidScope {
  code: `E3${number}`;
  description: "invalid_scope";
}
interface AuthorizeErrorUnauthorizedClient {
  code: `E4${number}`;
  description: "unauthorized_client";
}
interface AuthorizeErrorServerError {
  code: `E5${number}`;
  description: "server_error";
}
interface AuthorizeErrorInvalidGrant {
  code: `E6${number}`;
  description: "invalid_grant";
}

export const authorizeErrors = {
  jwksTimeout: {
    code: "E4001",
    description: "unauthorized_client",
  },
  jwksInvalid: {
    code: "E4002",
    description: "unauthorized_client",
  },
  jwksNoMatchingKey: {
    code: "E4003",
    description: "unauthorized_client",
  },
  jwksMultipleMatchingKeys: {
    code: "E4004",
    description: "unauthorized_client",
  },
  jwkInvalid: {
    code: "E4005",
    description: "unauthorized_client",
  },
  algNotAllowed: {
    code: "E2001",
    description: "invalid_request",
  },
  jwsInvalid: {
    code: "E2002",
    description: "invalid_request",
  },
  jwsSignatureVerificationFailed: {
    code: "E2003",
    description: "invalid_request",
  },
  jwtInvalid: {
    code: "E2004",
    description: "invalid_request",
  },
  jwtExpired: {
    code: "E2005",
    description: "invalid_request",
  },
  jwtClaimValidationFailed: {
    code: "E2006",
    description: "invalid_request",
  },
  verifyJwtError: {
    code: "E2007",
    description: "invalid_request",
  },
  verifyJwtUnknownError: {
    code: "E5008",
    description: "server_error",
  },
  invalidClaims: {
    code: "E2008",
    description: "invalid_request",
  },
  jarDecryptFailed: {
    code: "E2009",
    description: "invalid_request",
  },
  jarDecryptUnknownError: {
    code: "E5009",
    description: "server_error",
  },
} as const satisfies Record<
  string,
  | AuthorizeErrorAccessDenied
  | AuthorizeErrorInvalidRequest
  | AuthorizeErrorInvalidScope
  | AuthorizeErrorUnauthorizedClient
  | AuthorizeErrorServerError
  | AuthorizeErrorInvalidGrant
>;

export const getRedirectToClientRedirectUriResponse = (
  redirectUri: string,
  error: (typeof authorizeErrors)[keyof typeof authorizeErrors],
  state?: string,
): APIGatewayProxyResult => ({
  statusCode: 302,
  headers: {
    location: (() => {
      const url = new URL(redirectUri);
      url.searchParams.set("error", error.code);
      url.searchParams.set("error_description", error.description);
      if (state) {
        url.searchParams.set("state", state);
      }
      return url.toString();
    })(),
  },
  body: "",
});
