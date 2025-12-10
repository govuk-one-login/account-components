import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPublicKey } from "crypto";
import { importSPKI } from "jose";
import { Buffer } from "buffer";
import { getKMSKey } from "./getKmsKey.js";
import { getKmsClient } from "../../../../../commons/utils/awsClient/kmsClient/index.js";
import type { CryptoKey } from "jose";
import type { KeyObject } from "crypto";
import type { KMSClient, KMSClientResolvedConfig } from "@aws-sdk/client-kms";

vi.mock(import("jose"), () => ({
  importSPKI: vi.fn(),
}));
vi.mock(
  import("../../../../../commons/utils/awsClient/kmsClient/index.js"),
  () => ({
    getKmsClient: vi.fn(),
  }),
);
vi.mock(import("crypto"), () => ({
  createPublicKey: vi.fn(),
}));

const jwtSigningAlgorithm = "ES256";
const mockCreatePublicKey = vi.mocked(createPublicKey);

describe("getKMSKey", () => {
  const mockPublicKeyData = Buffer.from("mock-public-key-der");
  const mockPemKey = "-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----";
  const mockCryptoKey = {} as CryptoKey;
  type mockKmsClientType = ReturnType<typeof getKmsClient>;
  let mockKmsClient: mockKmsClientType;

  beforeEach(() => {
    vi.clearAllMocks();
    mockKmsClient = {
      client: {} as KMSClient,
      config: {} as KMSClientResolvedConfig,
      getPublicKey: vi.fn().mockResolvedValue({
        PublicKey: mockPublicKeyData,
      }),
      decrypt: vi.fn(),
      describeKey: vi.fn(),
      sign: vi.fn(),
    };

    vi.mocked(getKmsClient).mockReturnValue(mockKmsClient);

    const mockKeyObject = {
      export: vi.fn().mockReturnValue(mockPemKey),
    } as any as KeyObject;

    vi.mocked(createPublicKey).mockReturnValue(mockKeyObject);
    vi.mocked(importSPKI).mockResolvedValue(mockCryptoKey);
  });

  it("should fetch the public key from KMS and return a CryptoKey", async () => {
    const mockKeyAlias = "alias/test-key";
    const result = await getKMSKey(mockKeyAlias);

    expect(getKmsClient).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockKmsClient.getPublicKey)).toHaveBeenCalledWith({
      KeyId: mockKeyAlias,
    });

    expect(createPublicKey).toHaveBeenCalledWith({
      key: mockPublicKeyData,
      format: "der",
      type: "spki",
    });
    expect(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      (mockCreatePublicKey.mock.results[0]?.value as KeyObject).export,
    ).toHaveBeenCalledWith({
      format: "pem",
      type: "spki",
    });

    expect(importSPKI).toHaveBeenCalledWith(mockPemKey, jwtSigningAlgorithm);
    expect(result).toBe(mockCryptoKey);
  });

  it("should throw an error if PublicKey data is missing from KMS response", async () => {
    const mockKeyAliasDoesNotExist = "alias/test-key2";
    vi.mocked(mockKmsClient.getPublicKey).mockResolvedValue({
      PublicKey: undefined,
      $metadata: {},
    });

    await expect(getKMSKey(mockKeyAliasDoesNotExist)).rejects.toThrowError(
      `Public key data missing for KMS Key Alias: ${mockKeyAliasDoesNotExist}`,
    );
  });

  it("should return cached key on subsequent calls", async () => {
    const mockKeyAliasCached = "alias/test-cache-key";
    const result1 = await getKMSKey(mockKeyAliasCached);
    const result2 = await getKMSKey(mockKeyAliasCached);

    expect(getKmsClient).toHaveBeenCalledTimes(1);
    expect(mockKmsClient.getPublicKey).toHaveBeenCalledTimes(1);
    expect(result2).toBe(result1);
  });
});
