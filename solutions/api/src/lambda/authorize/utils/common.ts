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

export const authorizeErrors = {
  serverError: {
    code: "E5003",
    description: "server_error",
  },
  invalidRequest: {
    code: "E2003",
    description: "invalid_request",
  },
} as const;

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
