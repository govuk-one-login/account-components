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
import * as v from "valibot";
import assert from "node:assert";

const ORIGINAL_ENV = { ...process.env };

vi.mock(import("./common.js"), async () => {
  process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";
  return await vi.importActual("./common.js");
});

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/observability/index.js"), () => ({
  metrics: { addMetric: vi.fn() },
  setObservabilityAttributes: vi.fn(),
  logger: { warn: vi.fn(), error: vi.fn() },
}));

const mockJwtVerify = vi.fn();
const mockCreateRemoteJWKSet = vi.fn();

vi.mock(import("jose"), () => ({
  jwtVerify: mockJwtVerify,
  createRemoteJWKSet: mockCreateRemoteJWKSet,
}));

const mockGetClaimsSchema = vi.fn();

vi.mock(
  import("../../../../../commons/utils/authorize/getClaimsSchema.js"),
  () => ({
    getClaimsSchema: mockGetClaimsSchema,
  }),
);

let verifyJwt: typeof verifyJwtForType;

describe("verifyJwt", () => {
  const signedJwt = "test.jwt.token";
  const client = {
    client_id: "test-client",
    jwks_uri: "https://example.com/.well-known/jwks.json",
    scope: "openid",
    redirect_uris: ["https://example.com/callback"],
    client_name: "Test Client",
  };
  const redirectUri = "https://example.com/callback";
  const state = "test-state";

  beforeAll(async () => {
    const verifyJwtModule = await import("./verifyJwt.js");
    verifyJwt = verifyJwtModule.verifyJwt;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRemoteJWKSet.mockReturnValue("mock-jwks");
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("successfully verifies JWT and validates claims", async () => {
    const payload = { sub: "user123", aud: "test-client" };
    const claimsSchema = v.object({ sub: v.string(), aud: v.string() });

    mockJwtVerify.mockResolvedValue({ payload });
    mockGetClaimsSchema.mockReturnValue(claimsSchema);

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toStrictEqual(payload);
    expect(mockGetClaimsSchema).toHaveBeenCalledWith(
      client,
      redirectUri,
      state,
    );
  });

  it("returns ErrorResponse when JWT verification fails with JWKSTimeout", async () => {
    mockJwtVerify.mockRejectedValue(new JWKSTimeout());

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=unauthorized_client",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E4001",
    );
  });

  it("returns ErrorResponse when JWT verification fails with JWKSInvalid", async () => {
    mockJwtVerify.mockRejectedValue(new JWKSInvalid());

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=unauthorized_client",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E4002",
    );
  });

  it("returns ErrorResponse when JWT verification fails with JWKSNoMatchingKey", async () => {
    mockJwtVerify.mockRejectedValue(new JWKSNoMatchingKey());

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=unauthorized_client",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E4003",
    );
  });

  it("returns ErrorResponse when JWT verification fails with JWKSMultipleMatchingKeys", async () => {
    mockJwtVerify.mockRejectedValue(new JWKSMultipleMatchingKeys());

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=unauthorized_client",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E4004",
    );
  });

  it("returns ErrorResponse when JWT verification fails with JWKInvalid", async () => {
    mockJwtVerify.mockRejectedValue(new JWKInvalid());

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=unauthorized_client",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E4005",
    );
  });

  it("returns ErrorResponse when JWT verification fails with JOSEAlgNotAllowed", async () => {
    mockJwtVerify.mockRejectedValue(new JOSEAlgNotAllowed());

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2001",
    );
  });

  it("returns ErrorResponse when JWT verification fails with JWSInvalid", async () => {
    mockJwtVerify.mockRejectedValue(new JWSInvalid());

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2002",
    );
  });

  it("returns ErrorResponse when JWT verification fails with JWSSignatureVerificationFailed", async () => {
    mockJwtVerify.mockRejectedValue(new JWSSignatureVerificationFailed());

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2003",
    );
  });

  it("returns ErrorResponse when JWT verification fails with JWTInvalid", async () => {
    mockJwtVerify.mockRejectedValue(new JWTInvalid());

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2004",
    );
  });

  it("returns ErrorResponse when JWT verification fails with JWTExpired", async () => {
    const expiredError = new JWTExpired("", {});
    expiredError.payload = { exp: 1234567890 };
    mockJwtVerify.mockRejectedValue(expiredError);

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2005",
    );
  });

  it("returns ErrorResponse when JWT verification fails with JWTClaimValidationFailed", async () => {
    mockJwtVerify.mockRejectedValue(new JWTClaimValidationFailed("", {}));

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2006",
    );
  });

  it("returns ErrorResponse when claims validation fails", async () => {
    const payload = { sub: "user123" };
    const claimsSchema = v.object({ sub: v.string(), aud: v.string() });

    mockJwtVerify.mockResolvedValue({ payload });
    mockGetClaimsSchema.mockReturnValue(claimsSchema);

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2008",
    );
  });

  it("works without state parameter", async () => {
    const payload = { sub: "user123", aud: "test-client" };
    const claimsSchema = v.object({ sub: v.string(), aud: v.string() });

    mockJwtVerify.mockResolvedValue({ payload });
    mockGetClaimsSchema.mockReturnValue(claimsSchema);

    const result = await verifyJwt(signedJwt, client, redirectUri);

    expect(result).toStrictEqual(payload);
    expect(mockGetClaimsSchema).toHaveBeenCalledWith(
      client,
      redirectUri,
      undefined,
    );
  });

  it("returns ErrorResponse when JWT verification fails with JOSEError", async () => {
    const joseError = new JOSEError();
    joseError.code = "ERR_JOSE_GENERIC";
    mockJwtVerify.mockRejectedValue(joseError);

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=invalid_request",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2007",
    );
  });

  it("returns ErrorResponse when JWT verification fails with unknown error", async () => {
    mockJwtVerify.mockRejectedValue(new Error("Unknown error"));

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      "error=server_error",
    );
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E5002",
    );
  });

  it("includes state in error response when provided", async () => {
    mockJwtVerify.mockRejectedValue(new JWTInvalid());

    const result = await verifyJwt(signedJwt, client, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      `state=${state}`,
    );
  });
});
