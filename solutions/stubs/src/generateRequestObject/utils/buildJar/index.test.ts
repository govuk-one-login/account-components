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
import * as ssmProviderModule from "../../../../../commons/utils/awsClient/index.js";
import type { SSMProvider } from "@aws-lambda-powertools/parameters/ssm";
import type { Logger } from "@aws-lambda-powertools/logger";

vi.mock(import("@aws-lambda-powertools/parameters/ssm"), () => ({
  getParameter: vi.fn(),
}));

vi.mock(import("../../../utils/convert-pem-to-jwk.js"), () => ({
  convertPemToJwk: vi.fn(),
}));

vi.mock(import("../../../utils/logger.js"), () => ({
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

  const { convertPemToJwk } = await import(
    "../../../utils/convert-pem-to-jwk.js"
  );
  const convertPemToJwkMock = convertPemToJwk as unknown as MockInstance;

  let compactEncryptMock: { encrypt: Mock; setProtectedHeader: Mock };

  const mockGet = vi.fn();

  beforeEach(() => {
    process.env["RSA_PUBLIC_KEY_SSM_NAME"] = "param-name";

    convertPemToJwkMock.mockResolvedValue(dummyJwk);

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

    vi.spyOn(ssmProviderModule, "getParametersProvider").mockReturnValue({
      get: mockGet,
    } as unknown as SSMProvider);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    JWKS_KEY_TYPES.length = 0;
  });

  it("fetches the public key from SSM and encrypts the JWT", async () => {
    mockGet.mockResolvedValue(dummyPublicKeyPem);
    const result = await buildJar(dummySignedJwt);

    expect(mockGet).toHaveBeenCalledExactlyOnceWith("param-name");
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

  it("fetches the public key from local parameter when running on localhost", async () => {
    mockGet.mockResolvedValue(dummyPublicKeyPem);

    const result = await buildJar(dummySignedJwt);

    expect(mockGet).toHaveBeenCalledExactlyOnceWith("param-name");
    expect(result).toBe(dummyEncryptedJwt);
  });

  it("throws error if retrieving key from SSM fails", async () => {
    mockGet.mockRejectedValue(new Error("SSM error"));

    await expect(buildJar(dummySignedJwt)).rejects.toThrow(
      "Failed to retrieve key from SSM for param ",
    );
  });

  it("throws error if public key PEM is empty", async () => {
    mockGet.mockResolvedValue("");

    await expect(buildJar(dummySignedJwt)).rejects.toThrow(
      "Public key PEM is empty",
    );
  });

  it("throws error if key type not found", async () => {
    mockGet.mockResolvedValue(dummyPublicKeyPem);
    JWKS_KEY_TYPES.length = 0; // empty array to simulate missing key type

    await expect(buildJar(dummySignedJwt)).rejects.toThrow(
      `Unsupported signature type: ${SignatureTypes.RSA}`,
    );
  });
});
