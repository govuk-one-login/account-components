import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildJar } from "./index.js";
import * as kmsClient from "../../../../../commons/utils/awsClient/kmsClient/index.js";
import { CompactEncrypt, importSPKI } from "jose";
import { createPublicKey } from "node:crypto";
import type {
  DescribeKeyCommandOutput,
  GetPublicKeyCommandOutput,
} from "@aws-sdk/client-kms";

const ORIGINAL_ENV = { ...process.env };

vi.mock(import("../../../../../commons/utils/awsClient/kmsClient/index.js"));
vi.mock(import("jose"));
vi.mock(import("node:crypto"));

describe("buildJar", () => {
  const mockKmsClient = {
    client: {},
    config: {},
    getPublicKey: vi.fn(),
    describeKey: vi.fn(),
    decrypt: vi.fn(),
  } as unknown as Awaited<ReturnType<typeof kmsClient.getKmsClient>>;

  const mockPublicKeyBuffer = Buffer.from("mock-public-key-data");
  const mockPublicKeyPem =
    "-----BEGIN PUBLIC KEY-----\nmock-pem-data\n-----END PUBLIC KEY-----";
  const mockKeyId = "mock-key-id";
  const mockJwk = { kty: "RSA", n: "mock-n", e: "AQAB" };
  const mockEncryptedJwt = "encrypted.jwt.token";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };

    vi.mocked(kmsClient.getKmsClient).mockResolvedValue(mockKmsClient);
    vi.mocked(createPublicKey).mockReturnValue({
      export: vi.fn().mockReturnValue(mockPublicKeyPem),
    } as unknown as ReturnType<typeof createPublicKey>);
    vi.mocked(importSPKI).mockResolvedValue(
      mockJwk as unknown as Awaited<ReturnType<typeof importSPKI>>,
    );

    const mockInstance = {
      setProtectedHeader: vi.fn(),
      encrypt: vi.fn().mockResolvedValue(mockEncryptedJwt),
    };
    mockInstance.setProtectedHeader.mockReturnValue(mockInstance);
    vi.mocked(CompactEncrypt).mockImplementation(function (this: any) {
      return mockInstance;
    } as unknown as typeof CompactEncrypt);
  });

  it("should build JAR successfully", async () => {
    process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"] = "test-key-alias";

    vi.mocked(mockKmsClient).getPublicKey.mockResolvedValue({
      PublicKey: mockPublicKeyBuffer,
    } as unknown as GetPublicKeyCommandOutput);
    vi.mocked(mockKmsClient).describeKey.mockResolvedValue({
      KeyMetadata: { KeyId: mockKeyId },
    } as unknown as DescribeKeyCommandOutput);

    const result = await buildJar("signed.jwt.token");

    expect(result).toBe(mockEncryptedJwt);
  });

  it("should throw error when JAR_RSA_ENCRYPTION_KEY_ALIAS is not set", async () => {
    delete process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"];

    await expect(buildJar("test.jwt")).rejects.toThrow(
      "JAR_RSA_ENCRYPTION_KEY_ALIAS is not set",
    );
  });

  it("should throw error when public key data is missing", async () => {
    process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"] = "test-key-alias";

    vi.mocked(mockKmsClient).getPublicKey.mockResolvedValue(
      {} as unknown as GetPublicKeyCommandOutput,
    );

    await expect(buildJar("test.jwt")).rejects.toThrow(
      "Public key data is missing from KMS response",
    );
  });

  it("should set correct protected header for encryption", async () => {
    process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"] = "test-key-alias";

    vi.mocked(mockKmsClient).getPublicKey.mockResolvedValue({
      PublicKey: mockPublicKeyBuffer,
    } as unknown as GetPublicKeyCommandOutput);
    vi.mocked(mockKmsClient).describeKey.mockResolvedValue({
      KeyMetadata: { KeyId: mockKeyId },
    } as unknown as DescribeKeyCommandOutput);

    await buildJar("test.jwt");

    const mockInstance = vi.mocked(CompactEncrypt).mock.results[0]?.value as {
      setProtectedHeader: ReturnType<typeof vi.fn>;
      encrypt: ReturnType<typeof vi.fn>;
    };

    expect(mockInstance.setProtectedHeader).toHaveBeenCalledWith({
      alg: "RSA-OAEP-256",
      enc: "A256GCM",
      kid: mockKeyId,
    });
  });
});
