import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import * as v from "valibot";
import { getClaimsSchema } from "./getClaimsSchema.js";

const ORIGINAL_ENV = { ...process.env };

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/logger/index.js"), () => ({
  logger: { warn: vi.fn() },
}));

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/metrics/index.js"), () => ({
  metrics: { addMetric: vi.fn() },
}));

describe("getClaimsSchema", () => {
  const mockClient = {
    client_id: "test-client",
    scope: "account-delete other-scope",
    redirect_uris: ["https://example.com/callback"],
    client_name: "Test Client",
    jwks_uri: "https://example.com/jwks",
  };

  const redirectUri = "https://example.com/callback";
  const state = "test-state";

  beforeAll(() => {
    process.env["AUTHORIZE_ENDPOINT_URL"] = "https://auth.example.com";
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("creates schema with valid client and state", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);

    expect(schema).toBeDefined();
  });

  it("creates schema without state", () => {
    const schema = getClaimsSchema(mockClient, redirectUri);

    expect(schema).toBeDefined();
  });

  it("validates correct claims", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const validClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state,
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, validClaims);

    expect(result.success).toBe(true);
  });

  it("validates correct claims when refresh_token claim is not included", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const validClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state,
      jti: "unique-jti",
      access_token: "access-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, validClaims);

    expect(result.success).toBe(true);
  });

  it("validates correct claims when refresh_token is undefined", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const validClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state,
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: undefined,
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, validClaims);

    expect(result.success).toBe(true);
  });

  it("validates correct claims when refresh_token is null", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const validClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state,
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: null,
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, validClaims);

    expect(result.success).toBe(true);
  });

  it("validates claims without state when state is undefined", () => {
    const schema = getClaimsSchema(mockClient, redirectUri);
    const validClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state: undefined,
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, validClaims);

    expect(result.success).toBe(true);
  });

  it("fails validation for wrong client_id", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const invalidClaims = {
      client_id: "wrong-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state,
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for wrong issuer", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const invalidClaims = {
      client_id: "test-client",
      iss: "wrong-issuer",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state,
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for wrong audience", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const invalidClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://wrong.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state,
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for wrong response_type", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const invalidClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "token",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state,
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for future iat", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const invalidClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) + 3600,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state,
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for wrong redirect_uri", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const invalidClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: "https://wrong.example.com/callback",
      scope: "account-delete",
      state,
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for invalid scope", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const invalidClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "invalid-scope",
      state,
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for wrong state", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const invalidClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state: "wrong-state",
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for empty jti", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const invalidClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state,
      jti: "",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for invalid email", () => {
    const schema = getClaimsSchema(mockClient, redirectUri, state);
    const invalidClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state,
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "invalid-email",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("filters client scopes to only valid ones", () => {
    const clientWithMixedScopes = {
      ...mockClient,
      scope: "account-delete invalid-scope another-invalid",
    };

    const schema = getClaimsSchema(clientWithMixedScopes, redirectUri, state);
    const validClaims = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 10,
      redirect_uri: redirectUri,
      scope: "account-delete",
      state,
      jti: "unique-jti",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
    };

    const result = v.safeParse(schema, validClaims);

    expect(result.success).toBe(true);
  });

  it("throws error when AUTHORIZE_ENDPOINT_URL is not set", () => {
    delete process.env["AUTHORIZE_ENDPOINT_URL"];

    expect(() => {
      getClaimsSchema(mockClient, redirectUri, state);
    }).toThrow("AUTHORIZE_ENDPOINT_URL is not set");
  });
});
