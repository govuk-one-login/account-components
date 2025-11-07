import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import type { verifyJwt as verifyJwtForType } from "./verifyJwt.js";
import { ErrorResponse } from "./common.js";
import assert from "node:assert";
import {
  JOSEAlgNotAllowed,
  JOSEError,
  JWKInvalid,
  JWKSInvalid,
  JWKSMultipleMatchingKeys,
  JWKSNoMatchingKey,
  JWKSTimeout,
  JWSInvalid,
  JWSSignatureVerificationFailed,
  JWTClaimValidationFailed,
  JWTExpired,
  JWTInvalid,
} from "jose/errors";
import type { ClientEntry } from "../../../../../config/schema/types.js";

const ORIGINAL_ENV = { ...process.env };

vi.mock(import("./common.js"), async () => {
  process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";
  return await vi.importActual("./common.js");
});

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/logger/index.js"), () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/metrics/index.js"), () => ({
  metrics: { addMetric: vi.fn(), addDimensions: vi.fn() },
}));

const mockGet = vi.fn();
// @ts-expect-error
vi.mock(
  import("../../../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: () => ({
      get: mockGet,
    }),
  }),
);

const mockJwtVerify = vi.fn();
const mockCreateRemoteJWKSet = vi.fn();

vi.mock(import("jose"), () => ({
  jwtVerify: mockJwtVerify,
  createRemoteJWKSet: mockCreateRemoteJWKSet,
}));

let verifyJwt: typeof verifyJwtForType;

describe("verifyJwt", () => {
  const mockClient: ClientEntry = {
    client_id: "test-client",
    scope: "openid profile",
    redirect_uris: ["https://example.com/callback"],
    client_name: "Test Client",
    jwks_uri: "https://example.com/.well-known/jwks.json",
  };
  const redirectUri = "https://example.com/callback";
  const state = "test-state";
  const signedJwt = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.test.signature";
  const mockJwks = {};

  beforeAll(async () => {
    const verifyJwtModule = await import("./verifyJwt.js");
    verifyJwt = verifyJwtModule.verifyJwt;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env["AUTHORIZE_ENDPOINT_URL"] = "https://auth.example.com";
    process.env["REPLAY_ATTACK_TABLE_NAME"] = "test-replay-table";
    mockCreateRemoteJWKSet.mockReturnValue(mockJwks);
    mockGet.mockResolvedValue({});
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("successfully verifies valid JWT with valid claims", async () => {
    const mockPayload = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 60,
      iat: Math.floor(Date.now() / 1000) - 60,
      scope: "openid",
      state: "test-state",
      jti: "unique-id",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
      redirect_uri: redirectUri,
    };

    mockJwtVerify.mockResolvedValue({ payload: mockPayload });

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toStrictEqual(mockPayload);
    expect(mockJwtVerify).toHaveBeenCalledWith(signedJwt, mockJwks, {
      algorithms: ["ES256"],
    });
  });

  it("returns ErrorResponse for JWKSTimeout error", async () => {
    mockJwtVerify.mockRejectedValue(new JWKSTimeout("Timeout"));

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=unauthorized_client",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E4001",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "state=test-state",
    );
  });

  it("returns ErrorResponse for JWKSInvalid error", async () => {
    mockJwtVerify.mockRejectedValue(new JWKSInvalid("Invalid JWKS"));

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=unauthorized_client",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E4002",
    );
  });

  it("returns ErrorResponse for JWKSNoMatchingKey error", async () => {
    mockJwtVerify.mockRejectedValue(new JWKSNoMatchingKey("No matching key"));

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=unauthorized_client",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E4003",
    );
  });

  it("returns ErrorResponse for JWKSMultipleMatchingKeys error", async () => {
    mockJwtVerify.mockRejectedValue(
      new JWKSMultipleMatchingKeys("Multiple keys"),
    );

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=unauthorized_client",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E4004",
    );
  });

  it("returns ErrorResponse for JWKInvalid error", async () => {
    mockJwtVerify.mockRejectedValue(new JWKInvalid("Invalid JWK"));

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=unauthorized_client",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E4005",
    );
  });

  it("returns ErrorResponse for JOSEAlgNotAllowed error", async () => {
    mockJwtVerify.mockRejectedValue(
      new JOSEAlgNotAllowed("Algorithm not allowed"),
    );

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2001",
    );
  });

  it("returns ErrorResponse for JWSInvalid error", async () => {
    mockJwtVerify.mockRejectedValue(new JWSInvalid("Invalid JWS"));

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2002",
    );
  });

  it("returns ErrorResponse for JWSSignatureVerificationFailed error", async () => {
    mockJwtVerify.mockRejectedValue(
      new JWSSignatureVerificationFailed("Signature failed"),
    );

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2003",
    );
  });

  it("returns ErrorResponse for JWTInvalid error", async () => {
    mockJwtVerify.mockRejectedValue(new JWTInvalid("Invalid JWT"));

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2004",
    );
  });

  it("returns ErrorResponse for JWTExpired error", async () => {
    const expiredError = new JWTExpired("JWT expired", {});
    expiredError.payload = { exp: Math.floor(Date.now() / 1000) - 3600 };
    mockJwtVerify.mockRejectedValue(expiredError);

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2005",
    );
  });

  it("returns ErrorResponse for JWTClaimValidationFailed error", async () => {
    mockJwtVerify.mockRejectedValue(
      new JWTClaimValidationFailed("Claim validation failed", {}),
    );

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2006",
    );
  });

  it("returns ErrorResponse for generic JOSEError", async () => {
    const joseError = new JOSEError("Generic JOSE error");
    joseError.code = "ERR_JOSE_GENERIC";
    mockJwtVerify.mockRejectedValue(joseError);

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2007",
    );
  });

  it("returns ErrorResponse for unknown error", async () => {
    mockJwtVerify.mockRejectedValue(new Error("Unknown error"));

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E5002",
    );
  });

  it("works without state parameter", async () => {
    mockJwtVerify.mockRejectedValue(new JWTInvalid("Invalid JWT"));

    const result = await verifyJwt(signedJwt, mockClient, redirectUri);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).not.toContain("state=");
  });

  it("throws when AUTHORIZE_ENDPOINT_URL is not set", async () => {
    const mockPayload = {
      client_id: "wrong-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 60,
      iat: Math.floor(Date.now() / 1000) - 60,
      scope: "openid",
      state: "test-state",
      jti: "unique-id",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
      redirect_uri: redirectUri,
    };

    mockJwtVerify.mockResolvedValue({ payload: mockPayload });

    delete process.env["AUTHORIZE_ENDPOINT_URL"];

    await expect(
      verifyJwt(signedJwt, mockClient, redirectUri, state),
    ).rejects.toThrow("AUTHORIZE_ENDPOINT_URL is not set");
  });

  it("returns ErrorResponse for invalid claims", async () => {
    const mockPayload = {
      client_id: "wrong-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 60,
      iat: Math.floor(Date.now() / 1000) - 60,
      scope: "openid",
      state: "test-state",
      jti: "unique-id",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
      redirect_uri: redirectUri,
    };

    mockJwtVerify.mockResolvedValue({ payload: mockPayload });

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2008",
    );
  });

  it("returns ErrorResponse when iat is in the future", async () => {
    const mockPayload = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 60,
      iat: Math.floor(Date.now() / 1000) + 3600,
      scope: "openid",
      state: "test-state",
      jti: "unique-id",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
      redirect_uri: redirectUri,
    };

    mockJwtVerify.mockResolvedValue({ payload: mockPayload });

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2008",
    );
  });

  it("returns ErrorResponse when JTI is already used", async () => {
    const mockPayload = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 60,
      iat: Math.floor(Date.now() / 1000) - 60,
      scope: "openid",
      state: "test-state",
      jti: "duplicate-id",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
      redirect_uri: redirectUri,
    };

    mockJwtVerify.mockResolvedValue({ payload: mockPayload });
    mockGet.mockResolvedValue({ Item: { nonce: "duplicate-id" } });

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2010",
    );
  });

  it("returns ErrorResponse when DynamoDB get fails", async () => {
    const mockPayload = {
      client_id: "test-client",
      iss: "test-client",
      aud: "https://auth.example.com",
      response_type: "code",
      exp: Math.floor(Date.now() / 1000) + 60,
      iat: Math.floor(Date.now() / 1000) - 60,
      scope: "openid",
      state: "test-state",
      jti: "unique-id",
      access_token: "access-token",
      refresh_token: "refresh-token",
      sub: "user-123",
      email: "test@example.com",
      govuk_signin_journey_id: "journey-123",
      redirect_uri: redirectUri,
    };

    mockJwtVerify.mockResolvedValue({ payload: mockPayload });
    mockGet.mockRejectedValue(new Error("DynamoDB error"));

    const result = await verifyJwt(signedJwt, mockClient, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E5001",
    );
  });
});
