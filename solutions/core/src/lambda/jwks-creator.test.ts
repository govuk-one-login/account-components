import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockInstance } from "vitest";
import { handler, putContentToS3 } from "./jwks-creator.js";
import * as awsClientModule from "../../../commons/utils/awsClient/index.js";
import { exportJWK, importSPKI } from "jose";
import type { KeyObject } from "node:crypto";
import type { PutObjectCommandOutput } from "@aws-sdk/client-s3";

vi.mock(import("node:crypto"), () => ({
  createPublicKey: vi.fn(),
}));

vi.mock("@aws-lambda-powertools/logger", () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("jose", () => ({
  exportJWK: vi.fn(),
  importSPKI: vi.fn(),
}));

const mockGetPublicKey = vi.fn();
const mockPutObject = vi.fn();
const mockKmsClient = {
  kmsClient: {} as any,
  config: {} as any,
  getPublicKey: mockGetPublicKey,
};

const mockS3Client = {
  s3Client: { send: vi.fn() } as any,
  config: {} as any,
  putObject: mockPutObject,
};
describe("handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env["KMS_KEY_ID"] = "test-key-id";
    process.env["AWS_REGION"] = "us-east-1";
    process.env["BUCKET_NAME"] = "test-bucket";
    process.env["ALGORITHM"] = "RSA-OAEP-256";
    vi.spyOn(awsClientModule, "getKmsClient").mockReturnValue(mockKmsClient);
    vi.spyOn(awsClientModule, "getS3Client").mockReturnValue(mockS3Client);
  });

  it("throws error if KMS_KEY_ID is not set", async () => {
    delete process.env["KMS_KEY_ID"];
    await expect(handler()).rejects.toThrow(
      "KMS_KEY_ID environment variable is not set",
    );
  });

  it("successfully generates JWKS and uploads to S3", async () => {
    const { createPublicKey } = await import("node:crypto");
    const fakePublicKey = new Uint8Array([1, 2, 3, 4]);
    const fakeCryptoKey = { fake: true } as unknown;
    const fakeJwk = { kty: "RSA" };

    vi.mocked(createPublicKey).mockReturnValue({
      export: vi.fn().mockReturnValue(""),
    } as unknown as KeyObject);

    mockGetPublicKey.mockResolvedValueOnce({
      PublicKey: fakePublicKey,
    });

    (importSPKI as unknown as MockInstance).mockResolvedValue(fakeCryptoKey);
    (exportJWK as unknown as MockInstance).mockResolvedValue(fakeJwk);
    mockS3Client.putObject.mockResolvedValueOnce({
      $metadata: { httpStatusCode: 200 },
    });

    await expect(handler()).resolves.not.toThrow();

    expect(mockGetPublicKey).toHaveBeenCalledWith({ KeyId: "test-key-id" });
    expect(mockPutObject).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "jwks.json",
      Body: expect.stringContaining('"kty":"RSA"'),
      ContentType: "application/json",
    });
    expect(mockS3Client.putObject).toHaveBeenCalledTimes(1);
  });

  it("throws if public key is missing", async () => {
    mockGetPublicKey.mockResolvedValueOnce({
      PublicKey: undefined,
    });

    await expect(handler()).rejects.toThrow(
      "Public key not found for KMS key ID: test-key-id",
    );
  });

  it("handles error in KMS send", async () => {
    mockGetPublicKey.mockRejectedValueOnce(new Error("KMS failure"));
    await expect(handler()).rejects.toThrow("KMS failure");
  });
});

describe("putContentToS3", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uploads successfully", async () => {
    const mockResponse: PutObjectCommandOutput = {
      ETag: "etag123",
      $metadata: { httpStatusCode: 200 },
    };

    mockPutObject.mockResolvedValueOnce(mockResponse);

    const s3 = mockS3Client;
    const response = await putContentToS3(
      s3,
      "bucket",
      "file.json",
      '{"data":"ok"}',
    );

    expect(mockPutObject).toHaveBeenCalledWith({
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
    mockPutObject.mockRejectedValueOnce(new Error("S3 upload failed"));

    const s3 = mockS3Client;
    await expect(
      putContentToS3(s3, "bucket", "file.json", "{}"),
    ).rejects.toThrow("S3 upload failed");
  });
});
