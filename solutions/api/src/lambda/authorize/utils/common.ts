import type { APIGatewayProxyResult } from "aws-lambda";
import assert from "node:assert";
import type { authorizeErrors } from "../../../../../commons/utils/authorize/authorizeErrors.js";
import { getRedirectToClientRedirectUri } from "../../../../../commons/utils/authorize/getRedirectToClientRedirectUri.js";

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

export const getRedirectToClientRedirectUriResponse = (
  redirectUri: string,
  error?: (typeof authorizeErrors)[keyof typeof authorizeErrors],
  state?: string,
  code?: string,
): APIGatewayProxyResult => ({
  statusCode: 302,
  headers: {
    location: getRedirectToClientRedirectUri(redirectUri, error, state, code),
  },
  body: "",
});
