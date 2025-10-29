import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type {
  getRedirectToClientRedirectUriResponse as getRedirectToClientRedirectUriResponseForType,
  authorizeErrors as authorizeErrorsForType,
} from "./common.js";

const ORIGINAL_ENV = { ...process.env };

let getRedirectToClientRedirectUriResponse: typeof getRedirectToClientRedirectUriResponseForType;
let authorizeErrors: typeof authorizeErrorsForType;

describe("getRedirectToClientRedirectUriResponse", () => {
  beforeAll(async () => {
    process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";

    const commonModule = await import("./common.js");
    getRedirectToClientRedirectUriResponse =
      commonModule.getRedirectToClientRedirectUriResponse;
    authorizeErrors = commonModule.authorizeErrors;
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns redirect response with error parameters", () => {
    const result = getRedirectToClientRedirectUriResponse(
      "https://client.com/callback",
      authorizeErrors.invalidRequest,
    );

    expect(result).toEqual({
      statusCode: 302,
      headers: {
        location:
          "https://client.com/callback?error=invalid_request&error_description=E2003",
      },
      body: "",
    });
  });

  it("includes state parameter when provided", () => {
    const result = getRedirectToClientRedirectUriResponse(
      "https://client.com/callback",
      authorizeErrors.serverError,
      "test-state",
    );

    expect(result).toEqual({
      statusCode: 302,
      headers: {
        location:
          "https://client.com/callback?error=server_error&error_description=E5003&state=test-state",
      },
      body: "",
    });
  });

  it("handles redirect URI with existing query parameters", () => {
    const result = getRedirectToClientRedirectUriResponse(
      "https://client.com/callback?existing=param",
      authorizeErrors.invalidRequest,
    );

    expect(result).toEqual({
      statusCode: 302,
      headers: {
        location:
          "https://client.com/callback?existing=param&error=invalid_request&error_description=E2003",
      },
      body: "",
    });
  });
});
