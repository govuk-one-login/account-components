import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { authorizeErrors } from "../../../../../commons/utils/authorize/authorizeErrors.js";

const ORIGINAL_ENV = { ...process.env };

describe("getRedirectToClientRedirectUriResponse", () => {
  beforeAll(async () => {
    process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns redirect response with code parameter", async () => {
    const { getRedirectToClientRedirectUriResponse } =
      await import("./common.js");
    const result = getRedirectToClientRedirectUriResponse(
      "https://example.com/callback",
      undefined,
      undefined,
      "auth-code-123",
    );

    expect(result).toStrictEqual({
      statusCode: 302,
      headers: {
        location: "https://example.com/callback?code=auth-code-123",
      },
      body: "",
    });
  });

  it("returns redirect response with error parameters", async () => {
    const { getRedirectToClientRedirectUriResponse } =
      await import("./common.js");
    const result = getRedirectToClientRedirectUriResponse(
      "https://example.com/callback",
      authorizeErrors.jwtExpired,
    );

    expect(result).toStrictEqual({
      statusCode: 302,
      headers: {
        location:
          "https://example.com/callback?error=invalid_request&error_description=E1005",
      },
      body: "",
    });
  });

  it("returns redirect response with state parameter", async () => {
    const { getRedirectToClientRedirectUriResponse } =
      await import("./common.js");
    const result = getRedirectToClientRedirectUriResponse(
      "https://example.com/callback",
      undefined,
      "state-123",
    );

    expect(result).toStrictEqual({
      statusCode: 302,
      headers: {
        location: "https://example.com/callback?state=state-123",
      },
      body: "",
    });
  });

  it("returns redirect response with error and state parameters", async () => {
    const { getRedirectToClientRedirectUriResponse } =
      await import("./common.js");
    const result = getRedirectToClientRedirectUriResponse(
      "https://example.com/callback",
      authorizeErrors.verifyJwtUnknownError,
      "state-456",
    );

    expect(result).toStrictEqual({
      statusCode: 302,
      headers: {
        location:
          "https://example.com/callback?error=server_error&error_description=E3002&state=state-456",
      },
      body: "",
    });
  });

  it("returns redirect response with code and state parameters", async () => {
    const { getRedirectToClientRedirectUriResponse } =
      await import("./common.js");
    const result = getRedirectToClientRedirectUriResponse(
      "https://example.com/callback",
      undefined,
      "state-789",
      "auth-code-456",
    );

    expect(result).toStrictEqual({
      statusCode: 302,
      headers: {
        location:
          "https://example.com/callback?code=auth-code-456&state=state-789",
      },
      body: "",
    });
  });

  it("returns redirect response with only redirect URI when no optional parameters provided", async () => {
    const { getRedirectToClientRedirectUriResponse } =
      await import("./common.js");
    const result = getRedirectToClientRedirectUriResponse(
      "https://example.com/callback",
    );

    expect(result).toStrictEqual({
      statusCode: 302,
      headers: {
        location: "https://example.com/callback",
      },
      body: "",
    });
  });
});
