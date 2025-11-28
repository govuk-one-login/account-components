import { describe, it, expect } from "vitest";
import { authorizeErrors } from "./authorizeErrors.js";
import { getRedirectToClientRedirectUri } from "./getRedirectToClientRedirectUri.js";

describe("getRedirectToClientRedirectUri", () => {
  it("should add code parameter when code is provided", () => {
    const result = getRedirectToClientRedirectUri(
      "https://example.com/callback",
      undefined,
      undefined,
      "auth_code_123",
    );

    expect(result).toBe("https://example.com/callback?code=auth_code_123");
  });

  it("should add error parameters when error is provided", () => {
    const result = getRedirectToClientRedirectUri(
      "https://example.com/callback",
      authorizeErrors.userAborted,
    );

    expect(result).toBe(
      "https://example.com/callback?error=access_denied&error_description=E1001",
    );
  });

  it("should add state parameter when state is provided", () => {
    const result = getRedirectToClientRedirectUri(
      "https://example.com/callback",
      undefined,
      "state_123",
    );

    expect(result).toBe("https://example.com/callback?state=state_123");
  });

  it("should add both code and state parameters", () => {
    const result = getRedirectToClientRedirectUri(
      "https://example.com/callback",
      undefined,
      "state_123",
      "auth_code_123",
    );

    expect(result).toBe(
      "https://example.com/callback?code=auth_code_123&state=state_123",
    );
  });

  it("should add error, error_description and state parameters", () => {
    const result = getRedirectToClientRedirectUri(
      "https://example.com/callback",
      authorizeErrors.jwksTimeout,
      "state_123",
    );

    expect(result).toBe(
      "https://example.com/callback?error=unauthorized_client&error_description=E4001&state=state_123",
    );
  });

  it("should preserve existing query parameters", () => {
    const result = getRedirectToClientRedirectUri(
      "https://example.com/callback?existing=param",
      undefined,
      undefined,
      "auth_code_123",
    );

    expect(result).toBe(
      "https://example.com/callback?existing=param&code=auth_code_123",
    );
  });

  it("should return original URL when no parameters are provided", () => {
    const result = getRedirectToClientRedirectUri(
      "https://example.com/callback",
    );

    expect(result).toBe("https://example.com/callback");
  });

  it("should handle relative redirect URI with code parameter", () => {
    const result = getRedirectToClientRedirectUri(
      "/callback",
      undefined,
      undefined,
      "auth_code_123",
    );

    expect(result).toBe("/callback?code=auth_code_123");
  });

  it("should handle relative redirect URI with error parameters", () => {
    const result = getRedirectToClientRedirectUri(
      "/callback",
      authorizeErrors.userAborted,
    );

    expect(result).toBe(
      "/callback?error=access_denied&error_description=E1001",
    );
  });

  it("should handle relative redirect URI with state parameter", () => {
    const result = getRedirectToClientRedirectUri(
      "/callback",
      undefined,
      "state_123",
    );

    expect(result).toBe("/callback?state=state_123");
  });

  it("should handle relative redirect URI with no parameters", () => {
    const result = getRedirectToClientRedirectUri("/callback");

    expect(result).toBe("/callback");
  });
});
