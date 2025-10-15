import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockInstance } from "vitest";
import { handler, putContentToS3 } from "./jwks-creator.js";
import { GetPublicKeyCommand } from "@aws-sdk/client-kms";
import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { exportJWK, importSPKI } from "jose";

vi.mock("@aws-lambda-powertools/logger", () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@aws-sdk/client-kms", () => {
  const mockSend = vi.fn();
  return {
    KMSClient: vi.fn(() => ({ send: mockSend })),
    GetPublicKeyCommand: vi.fn(),
    __mockSend: mockSend,
  };
});

vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn();
  return {
    S3Client: vi.fn(() => ({ send: mockSend })),
    PutObjectCommand: vi.fn(),
    __mockSend: mockSend,
  };
});

vi.mock("jose", () => ({
  exportJWK: vi.fn(),
  importSPKI: vi.fn(),
}));

const { __mockSend: mockKmsSend } = (await import(
  "@aws-sdk/client-kms"
)) as unknown as {
  __mockSend: MockInstance;
};

const { __mockSend: mockS3Send } = (await import(
  "@aws-sdk/client-s3"
)) as unknown as {
  __mockSend: MockInstance;
};

describe("handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env["KMS_KEY_ID"] = "test-key-id";
    process.env["AWS_REGION"] = "us-east-1";
    process.env["BUCKET_NAME"] = "test-bucket";
    process.env["ALGORITHM"] = "RSA-OAEP-256";
  });

  it("throws error if KMS_KEY_ID is not set", async () => {
    delete process.env["KMS_KEY_ID"];
    await expect(handler()).rejects.toThrow(
      "KMS_KEY_ID environment variable is not set",
    );
  });

  it("successfully generates JWKS and uploads to S3", async () => {
    const fakePublicKey = new Uint8Array([1, 2, 3, 4]);
    /* eslint-disable n/no-unsupported-features/node-builtins */
    const fakeCryptoKey = { fake: true } as unknown as CryptoKey;
    const fakeJwk = { kty: "RSA" };

    mockKmsSend.mockResolvedValueOnce({ PublicKey: fakePublicKey });
    (importSPKI as unknown as MockInstance).mockResolvedValue(fakeCryptoKey);
    (exportJWK as unknown as MockInstance).mockResolvedValue(fakeJwk);
    mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

    await expect(handler()).resolves.not.toThrow();

    expect(GetPublicKeyCommand).toHaveBeenCalledWith({ KeyId: "test-key-id" });
    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "jwks.json",
      Body: expect.stringContaining('"kty":"RSA"'),
      ContentType: "application/json",
    });
    expect(mockS3Send).toHaveBeenCalledTimes(1);
  });

  it("throws if public key is missing", async () => {
    mockKmsSend.mockResolvedValueOnce({ PublicKey: undefined });
    await expect(handler()).rejects.toThrow(
      "Public key not found for KMS key ID: test-key-id",
    );
  });

  it("handles error in KMS send", async () => {
    mockKmsSend.mockRejectedValueOnce(new Error("KMS failure"));
    await expect(handler()).rejects.toThrow("KMS failure");
  });
});

describe("putContentToS3", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uploads successfully", async () => {
    // const mockResponse: PutObjectCommandOutput = { ETag: "etag123" };
    const mockResponse: PutObjectCommandOutput = {
      ETag: "etag123",
      $metadata: { httpStatusCode: 200 },
    };

    mockS3Send.mockResolvedValueOnce(mockResponse);

    const s3 = new S3Client({});
    const response = await putContentToS3(
      s3,
      "bucket",
      "file.json",
      '{"data":"ok"}',
    );

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "file.json",
      Body: '{"data":"ok"}',
      ContentType: "application/json",
    });
    expect(response).toEqual({
      ETag: "etag123",
      $metadata: { httpStatusCode: 200 },
    });
  });

  it("throws on S3 upload error", async () => {
    mockS3Send.mockRejectedValueOnce(new Error("S3 upload failed"));

    const s3 = new S3Client({});
    await expect(
      putContentToS3(s3, "bucket", "file.json", "{}"),
    ).rejects.toThrow("S3 upload failed");
  });
});
