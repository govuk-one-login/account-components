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
vi.mock(import("../../../commons/utils/logger/index.js"), () => ({
  logger: { warn: vi.fn() },
}));

describe("getClaimsSchema", () => {
  const mockAddMetricDimension = vi.fn();
  const mockClient = {
    client_id: "test-client",
    scope: "account-delete other-scope",
    redirect_uris: ["https://example.com/callback"],
    client_name: "Test Client",
    jwks_uri: "https://example.com/jwks",
    consider_user_logged_in: false,
  };

  const redirectUri = "https://example.com/callback";
  const scope = "account-delete";
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
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
      state,
    );

    expect(schema).toBeDefined();
  });

  it("creates schema without state", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
    );

    expect(schema).toBeDefined();
  });

  it("validates correct claims", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
      state,
    );
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
      account_management_api_access_token: "management-token",
      account_data_api_access_token: "data-token",
      sub: "user-123",
      public_sub: "public-user-123",
      email: "test@example.com",
    };

    const result = v.safeParse(schema, validClaims);

    expect(result.success).toBe(true);
  });

  it("validates correct claims when optional fields aren't present", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
      state,
    );
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
      sub: "user-123",
      public_sub: "public-user-123",
      email: "test@example.com",
    };

    const result = v.safeParse(schema, validClaims);

    expect(result.success).toBe(true);
  });

  it("validates claims without state when state is undefined", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
    );
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
      account_management_api_access_token: "management-token",
      account_data_api_access_token: "data-token",
      sub: "user-123",
      public_sub: "public-user-123",
      email: "test@example.com",
    };

    const result = v.safeParse(schema, validClaims);

    expect(result.success).toBe(true);
  });

  it("fails validation for wrong client_id", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
      state,
    );
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
      account_management_api_access_token: "management-token",
      account_data_api_access_token: "data-token",
      sub: "user-123",
      public_sub: "public-user-123",
      email: "test@example.com",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for wrong issuer", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
      state,
    );
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
      account_management_api_access_token: "management-token",
      account_data_api_access_token: "data-token",
      sub: "user-123",
      public_sub: "public-user-123",
      email: "test@example.com",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for wrong audience", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
      state,
    );
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
      account_management_api_access_token: "management-token",
      account_data_api_access_token: "data-token",
      sub: "user-123",
      public_sub: "public-user-123",
      email: "test@example.com",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for wrong response_type", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
      state,
    );
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
      account_management_api_access_token: "management-token",
      account_data_api_access_token: "data-token",
      sub: "user-123",
      public_sub: "public-user-123",
      email: "test@example.com",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for future iat", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
      state,
    );
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
      account_management_api_access_token: "management-token",
      account_data_api_access_token: "data-token",
      sub: "user-123",
      public_sub: "public-user-123",
      email: "test@example.com",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for wrong redirect_uri", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
      state,
    );
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
      account_management_api_access_token: "management-token",
      account_data_api_access_token: "data-token",
      sub: "user-123",
      public_sub: "public-user-123",
      email: "test@example.com",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for invalid scope", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
      state,
    );
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
      account_management_api_access_token: "management-token",
      account_data_api_access_token: "data-token",
      sub: "user-123",
      public_sub: "public-user-123",
      email: "test@example.com",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for wrong state", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
      state,
    );
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
      account_management_api_access_token: "management-token",
      account_data_api_access_token: "data-token",
      sub: "user-123",
      public_sub: "public-user-123",
      email: "test@example.com",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for empty jti", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
      state,
    );
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
      account_management_api_access_token: "management-token",
      account_data_api_access_token: "data-token",
      sub: "user-123",
      public_sub: "public-user-123",
      email: "test@example.com",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("fails validation for invalid email", () => {
    const schema = getClaimsSchema(
      mockAddMetricDimension,
      mockClient,
      redirectUri,
      scope,
      state,
    );
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
      account_management_api_access_token: "management-token",
      account_data_api_access_token: "data-token",
      sub: "user-123",
      public_sub: "public-user-123",
      email: "invalid-email",
    };

    const result = v.safeParse(schema, invalidClaims);

    expect(result.success).toBe(false);
  });

  it("filters client scopes to only valid ones", () => {
    const clientWithMixedScopes = {
      ...mockClient,
      scope: "account-delete invalid-scope another-invalid",
    };

    const schema = getClaimsSchema(
      mockAddMetricDimension,
      clientWithMixedScopes,
      redirectUri,
      scope,
      state,
    );
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
      account_management_api_access_token: "management-token",
      account_data_api_access_token: "data-token",
      sub: "user-123",
      public_sub: "public-user-123",
      email: "test@example.com",
    };

    const result = v.safeParse(schema, validClaims);

    expect(result.success).toBe(true);
  });

  it("throws error when AUTHORIZE_ENDPOINT_URL is not set", () => {
    delete process.env["AUTHORIZE_ENDPOINT_URL"];

    expect(() => {
      getClaimsSchema(
        mockAddMetricDimension,
        mockClient,
        redirectUri,
        scope,
        state,
      );
    }).toThrow("AUTHORIZE_ENDPOINT_URL is not set");
  });
});
