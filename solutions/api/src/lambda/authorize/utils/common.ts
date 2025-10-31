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

type AuthorizeErrorType = "invalid_request" | "server_error";
type AuthorizeErrorDescription = `E${number}`;

export const authorizeErrors = {
  jarDecryptionUnknownError: {
    description: "E5003",
    type: "server_error",
  },
  jarDecryptionFailed: {
    description: "E2003",
    type: "invalid_request",
  },
  jwtVerificationFailed: {
    description: "E2001",
    type: "invalid_request",
  },
} as const satisfies Record<
  string,
  {
    description: AuthorizeErrorDescription;
    type: AuthorizeErrorType;
  }
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
      url.searchParams.set("error", error.type);
      url.searchParams.set("error_description", error.description);
      if (state) {
        url.searchParams.set("state", state);
      }
      return url.toString();
    })(),
  },
  body: "",
});
