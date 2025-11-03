import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import { createCipheriv, randomBytes } from "node:crypto";
import type { decryptJar as decryptJarForType } from "./decryptJar.js";
import { ErrorResponse } from "./common.js";
import assert from "node:assert";

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

const mockKmsClient = {
  decrypt: vi.fn(),
  describeKey: vi.fn(),
};

vi.mock(
  import("../../../../../commons/utils/awsClient/kmsClient/index.js"),
  () => ({
    getKmsClient: vi.fn().mockReturnValue(mockKmsClient),
  }),
);

let decryptJar: typeof decryptJarForType;

describe("decryptJar", () => {
  const clientId = "test-client";
  const redirectUri = "https://example.com/callback";
  const state = "test-state";

  beforeAll(async () => {
    const decryptJarModule = await import("./decryptJar.js");
    decryptJar = decryptJarModule.decryptJar;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"] = "test-key-alias";
    mockKmsClient.describeKey.mockResolvedValue({
      KeyMetadata: { KeyId: "test-key-id" },
    });
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("successfully decrypts valid JAR", async () => {
    const payload = "test-payload";
    const key = randomBytes(32);
    const iv = randomBytes(12);

    const protectedHeader = Buffer.from(
      JSON.stringify({
        alg: "RSA-OAEP-256",
        enc: "A256GCM",
        kid: "test-key-id",
      }),
    ).toString("base64");

    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(protectedHeader, "ascii"));

    const encrypted = Buffer.concat([
      cipher.update(payload, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    const jar = [
      protectedHeader,
      "encrypted-key",
      Buffer.from(iv).toString("base64"),
      Buffer.from(encrypted).toString("base64"),
      Buffer.from(tag).toString("base64"),
    ].join(".");

    mockKmsClient.decrypt.mockResolvedValue({
      Plaintext: key,
    });

    const result = await decryptJar(jar, clientId, redirectUri, state);

    expect(result).toBe(payload);
  });

  it("returns ErrorResponse when JAR format is invalid", async () => {
    const result = await decryptJar(
      "invalid.jar",
      clientId,
      redirectUri,
      state,
    );

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E5003",
    );
  });

  it("returns ErrorResponse when header is invalid", async () => {
    const invalidHeader = Buffer.from(
      JSON.stringify({
        alg: "invalid-alg",
        enc: "A256GCM",
        kid: "test-key-id",
      }),
    ).toString("base64");

    const jar = [invalidHeader, "key", "iv", "ciphertext", "tag"].join(".");

    const result = await decryptJar(jar, clientId, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E5003",
    );
  });

  it("returns ErrorResponse when KMS decryption fails", async () => {
    const protectedHeader = Buffer.from(
      JSON.stringify({
        alg: "RSA-OAEP-256",
        enc: "A256GCM",
        kid: "test-key-id",
      }),
    ).toString("base64");

    const jar = [protectedHeader, "key", "iv", "ciphertext", "tag"].join(".");

    mockKmsClient.decrypt.mockRejectedValue(new Error("KMS error"));

    const result = await decryptJar(jar, clientId, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2003",
    );
  });

  it("returns ErrorResponse when KMS returns no plaintext", async () => {
    const protectedHeader = Buffer.from(
      JSON.stringify({
        alg: "RSA-OAEP-256",
        enc: "A256GCM",
        kid: "test-key-id",
      }),
    ).toString("base64");

    const jar = [protectedHeader, "key", "iv", "ciphertext", "tag"].join(".");

    mockKmsClient.decrypt.mockResolvedValue({});

    const result = await decryptJar(jar, clientId, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E2003",
    );
  });

  it("returns ErrorResponse when JAR_RSA_ENCRYPTION_KEY_ALIAS not set", async () => {
    delete process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"];

    const jar = "header.key.iv.ciphertext.tag";

    const result = await decryptJar(jar, clientId, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E5003",
    );
  });

  it("includes state in error response when provided", async () => {
    const result = await decryptJar("invalid", clientId, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).toContain(
      `state=${state}`,
    );
  });

  it("works without state parameter", async () => {
    const result = await decryptJar("invalid", clientId, redirectUri);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.headers?.["location"]).not.toContain("state=");
  });

  it("returns ErrorResponse when kid does not match keyId", async () => {
    const invalidHeader = Buffer.from(
      JSON.stringify({
        alg: "RSA-OAEP-256",
        enc: "A256GCM",
        kid: "wrong-key-id",
      }),
    ).toString("base64");

    const jar = [invalidHeader, "key", "iv", "ciphertext", "tag"].join(".");

    const result = await decryptJar(jar, clientId, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E5003",
    );
  });

  it("returns ErrorResponse when describeKey fails", async () => {
    mockKmsClient.describeKey.mockRejectedValue(new Error("KMS error"));

    const jar = "header.key.iv.ciphertext.tag";

    const result = await decryptJar(jar, clientId, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E5003",
    );
  });

  it("returns ErrorResponse when describeKey returns no keyId", async () => {
    mockKmsClient.describeKey.mockResolvedValue({ KeyMetadata: {} });

    const jar = "header.key.iv.ciphertext.tag";

    const result = await decryptJar(jar, clientId, redirectUri, state);

    expect(result).toBeInstanceOf(ErrorResponse);

    assert.ok(result instanceof ErrorResponse);

    expect(result.errorResponse.statusCode).toBe(302);
    expect(result.errorResponse.headers?.["location"]).toContain(
      "error_description=E5003",
    );
  });
});
