import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance, Mock } from "vitest";
import { buildJar } from "./index.js";
import * as convertPem from "../../../utils/convert-pem-to-jwk.js";
import {
  Algorithms,
  JWEAlgorithms,
  JWKS_KEY_TYPES,
  SignatureTypes,
} from "../../../types/common.js";
import { CompactEncrypt } from "jose";
import * as awsClientModule from "../../../../../commons/utils/awsClient/index.js";
import type { Logger } from "@aws-lambda-powertools/logger";

vi.mock(import("node:crypto"), () => ({
  createPublicKey: vi.fn(),
}));

vi.mock(import("../../../utils/convert-pem-to-jwk.js"), () => ({
  convertPemToJwk: vi.fn(),
}));

vi.mock(import("../../../../../commons/utils/logger/index.js"), () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  } as unknown as Logger,
}));

describe("buildJar", async () => {
  const dummySignedJwt = "dummy.jwt.token";
  const dummyPublicKeyPem =
    "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----";
  const dummyJwk = { kty: "RSA", kid: "key1", alg: "RSA-OAEP" };
  const dummyEncryptedJwt = "encrypted.jwt.token";
  const dummyPublicKeyBuffer = Buffer.from("dummy-public-key-data");

  const { convertPemToJwk } = await import(
    "../../../utils/convert-pem-to-jwk.js"
  );
  const convertPemToJwkMock = convertPemToJwk as unknown as MockInstance;

  let compactEncryptMock: { encrypt: Mock; setProtectedHeader: Mock };

  const mockGetPublicKey = vi.fn();
  const mockKmsClient = {
    client: {} as any,
    config: {} as any,
    getPublicKey: mockGetPublicKey,
    decrypt: vi.fn(),
    describeKey: vi.fn(),
  };

  beforeEach(async () => {
    process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"] = "alias/rsa-key";

    convertPemToJwkMock.mockResolvedValue(dummyJwk);
    mockGetPublicKey.mockResolvedValue({
      PublicKey: dummyPublicKeyBuffer,
    });

    JWKS_KEY_TYPES.length = 0;
    JWKS_KEY_TYPES.push({
      kty: SignatureTypes.RSA,
      kid: "key1",
      jweAlg: JWEAlgorithms.RSA,
      alg: Algorithms.RSA,
    });

    compactEncryptMock = {
      setProtectedHeader: vi.fn().mockReturnThis(),
      encrypt: vi.fn().mockResolvedValue(dummyEncryptedJwt),
    };

    // @ts-expect-error:mocking external lib that doesn't match signature
    vi.spyOn(CompactEncrypt.prototype, "constructor").mockImplementation(
      // @ts-expect-error: same as line 83
      () => compactEncryptMock,
    );
    vi.spyOn(CompactEncrypt.prototype, "setProtectedHeader").mockImplementation(
      compactEncryptMock.setProtectedHeader,
    );
    vi.spyOn(CompactEncrypt.prototype, "encrypt").mockImplementation(
      compactEncryptMock.encrypt,
    );

    vi.spyOn(awsClientModule, "getKmsClient").mockResolvedValue(mockKmsClient);

    const { createPublicKey } = await import("node:crypto");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    vi.mocked(createPublicKey).mockReturnValue({
      export: vi.fn().mockReturnValue(dummyPublicKeyPem),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    JWKS_KEY_TYPES.length = 0;
  });

  it("fetches the public key from KMS and encrypts the JWT", async () => {
    const result = await buildJar(dummySignedJwt);

    expect(mockGetPublicKey).toHaveBeenCalledExactlyOnceWith({
      KeyId: "alias/rsa-key",
    });
    expect(convertPem.convertPemToJwk).toHaveBeenCalledExactlyOnceWith(
      dummyPublicKeyPem,
      JWKS_KEY_TYPES[0],
    );
    expect(
      compactEncryptMock.setProtectedHeader,
    ).toHaveBeenCalledExactlyOnceWith({
      alg: "RSA-OAEP-256",
      enc: "A256GCM",
      kid: "key1",
    });
    expect(compactEncryptMock.encrypt).toHaveBeenCalledExactlyOnceWith({
      alg: "RSA-OAEP",
      kid: "key1",
      kty: "RSA",
    });
    expect(result).toBe(dummyEncryptedJwt);
  });

  it("throws error if environment variable is not set", async () => {
    const originalEnv = process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"];
    delete process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"];

    await expect(buildJar(dummySignedJwt)).rejects.toThrow(
      "Failed to retrieve key from KMS",
    );

    // Restore for other tests
    // eslint-disable-next-line vitest/no-conditional-in-test
    if (originalEnv) {
      process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"] = originalEnv;
    }
  });

  it("throws error if retrieving key from KMS fails", async () => {
    mockGetPublicKey.mockRejectedValue(new Error("KMS error"));

    await expect(buildJar(dummySignedJwt)).rejects.toThrow(
      "Failed to retrieve key from KMS",
    );
  });

  it("throws error if public key PEM is empty", async () => {
    const { createPublicKey } = await import("node:crypto");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    vi.mocked(createPublicKey).mockReturnValue({
      export: vi.fn().mockReturnValue(""),
    } as any);

    await expect(buildJar(dummySignedJwt)).rejects.toThrow(
      "Public key PEM is empty",
    );
  });

  it("throws error if key type not found", async () => {
    JWKS_KEY_TYPES.length = 0; // empty array to simulate missing key type

    await expect(buildJar(dummySignedJwt)).rejects.toThrow(
      `Unsupported signature type: ${SignatureTypes.RSA}`,
    );
  });
});
