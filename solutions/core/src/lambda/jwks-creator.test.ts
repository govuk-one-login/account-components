import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockInstance } from "vitest";
import { handler, putContentToS3 } from "./jwks-creator.js";
import type { CryptoKey } from "jose";
import { exportJWK, importSPKI } from "jose";
import type { Context } from "aws-lambda";

const mockGetPublicKey = vi.fn();
const mockDescribeKey = vi.fn();
const mockPutObject = vi.fn();

// @ts-expect-error
vi.mock(import("@aws-lambda-powertools/logger"), () => ({
  Logger: class {
    info = vi.fn();
    warn = vi.fn();
    error = vi.fn();
    addContext = vi.fn();
  },
}));

// @ts-expect-error
vi.mock(import("../../../commons/utils/awsClient/kmsClient/index.js"), () => ({
  getKmsClient: () => ({
    getPublicKey: mockGetPublicKey,
    describeKey: mockDescribeKey,
  }),
}));

// @ts-expect-error
vi.mock(import("../../../commons/utils/awsClient/s3Client/index.js"), () => ({
  getS3Client: () => ({
    putObject: mockPutObject,
  }),
}));

// @ts-expect-error
vi.mock(import("../../../commons/utils/contstants.js"), () => ({
  jarKeyEncryptionAlgorithm: "RSA-OAEP-256",
}));

vi.mock(import("jose"), () => ({
  exportJWK: vi.fn(),
  importSPKI: vi.fn(),
}));

// @ts-expect-error
vi.mock(import("node:crypto"), () => ({
  createPublicKey: vi.fn(() => ({
    export: vi.fn(
      () =>
        "-----BEGIN PUBLIC KEY-----\nMOCKEDPUBLICKEY==\n-----END PUBLIC KEY-----",
    ),
  })),
}));

const context: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "test-function",
  functionVersion: "1",
  invokedFunctionArn:
    "arn:aws:lambda:us-east-1:123456789012:function:test-function",
  memoryLimitInMB: "128",
  awsRequestId: "test-request-id",
  logGroupName: "/aws/lambda/test-function",
  logStreamName: "2023/01/01/[$LATEST]test-stream",
  getRemainingTimeInMillis: () => 30000,
  done: vi.fn(),
  fail: vi.fn(),
  succeed: vi.fn(),
};

describe("handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetPublicKey.mockReset();
    mockDescribeKey.mockReset();
    mockPutObject.mockReset();
    process.env["BUCKET_NAME"] = "test-bucket";
    process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"] = "alias/test-key";
  });

  it("successfully generates JWKS and uploads to S3", async () => {
    const fakePublicKey = new Uint8Array([1, 2, 3, 4]);
    const fakeCryptoKey = { fake: true } as unknown as CryptoKey;
    const fakeJwk = { kty: "RSA" };

    mockGetPublicKey.mockResolvedValueOnce({ PublicKey: fakePublicKey });
    mockDescribeKey.mockResolvedValueOnce({
      KeyMetadata: { KeyId: "test-key-id" },
    });
    (importSPKI as unknown as MockInstance).mockResolvedValue(fakeCryptoKey);
    (exportJWK as unknown as MockInstance).mockResolvedValue(fakeJwk);
    mockPutObject.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

    await expect(handler({}, context)).resolves.not.toThrow();

    expect(mockGetPublicKey).toHaveBeenCalledWith({
      KeyId: "alias/test-key",
    });
    expect(mockDescribeKey).toHaveBeenCalledWith({
      KeyId: "alias/test-key",
    });
    expect(mockPutObject).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "jwks.json",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Body: expect.stringMatching(
        /"kid":"test-key-id".*"alg":"RSA-OAEP-256".*"use":"enc"/,
      ),
      ContentType: "application/json",
    });
  });

  it("throws if BUCKET_NAME is not set", async () => {
    const fakePublicKey = new Uint8Array([1, 2, 3, 4]);
    const fakeCryptoKey = { fake: true } as unknown as CryptoKey;
    const fakeJwk = { kty: "RSA" };

    mockGetPublicKey.mockResolvedValueOnce({ PublicKey: fakePublicKey });
    mockDescribeKey.mockResolvedValueOnce({
      KeyMetadata: { KeyId: "test-key-id" },
    });
    (importSPKI as unknown as MockInstance).mockResolvedValue(fakeCryptoKey);
    (exportJWK as unknown as MockInstance).mockResolvedValue(fakeJwk);

    delete process.env["BUCKET_NAME"];

    await expect(handler({}, context)).rejects.toThrow("BUCKET_NAME not set");
  });

  it("throws if JAR_RSA_ENCRYPTION_KEY_ALIAS is not set", async () => {
    delete process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"];

    await expect(handler({}, context)).rejects.toThrow(
      "JAR_RSA_ENCRYPTION_KEY_ALIAS not set",
    );
  });

  it("throws if public key is missing", async () => {
    mockGetPublicKey.mockResolvedValueOnce({ PublicKey: undefined });

    await expect(handler({}, context)).rejects.toThrow(
      "Public key not found for KMS Key Alias: alias/test-key",
    );
  });

  it("throws if key metadata is missing", async () => {
    const fakePublicKey = new Uint8Array([1, 2, 3, 4]);

    mockGetPublicKey.mockResolvedValueOnce({ PublicKey: fakePublicKey });
    mockDescribeKey.mockResolvedValueOnce({ KeyMetadata: undefined });

    await expect(handler({}, context)).rejects.toThrow(
      "Key ID not found for KMS Key Alias: alias/test-key",
    );
  });

  it("throws if KeyId is missing in metadata", async () => {
    const fakePublicKey = new Uint8Array([1, 2, 3, 4]);
    const fakeCryptoKey = { fake: true } as unknown as CryptoKey;
    const fakeJwk = { kty: "RSA" };

    mockGetPublicKey.mockResolvedValueOnce({ PublicKey: fakePublicKey });
    mockDescribeKey.mockResolvedValueOnce({ KeyMetadata: {} }); // Missing KeyId
    (importSPKI as unknown as MockInstance).mockResolvedValue(fakeCryptoKey);
    (exportJWK as unknown as MockInstance).mockResolvedValue(fakeJwk);

    await expect(handler({}, context)).rejects.toThrow(
      "KeyMetadata.KeyId not defined",
    );
  });

  it("handles error in KMS getPublicKey", async () => {
    mockGetPublicKey.mockRejectedValueOnce(new Error("KMS failure"));

    await expect(handler({}, context)).rejects.toThrow("KMS failure");
  });

  it("handles error in KMS describeKey", async () => {
    const fakePublicKey = new Uint8Array([1, 2, 3, 4]);

    mockGetPublicKey.mockResolvedValueOnce({ PublicKey: fakePublicKey });
    mockDescribeKey.mockRejectedValueOnce(new Error("KMS describe failure"));

    await expect(handler({}, context)).rejects.toThrow("KMS describe failure");
  });

  it("handles error in JOSE operations", async () => {
    const fakePublicKey = new Uint8Array([1, 2, 3, 4]);

    mockGetPublicKey.mockResolvedValueOnce({ PublicKey: fakePublicKey });
    mockDescribeKey.mockResolvedValueOnce({
      KeyMetadata: { KeyId: "test-key-id" },
    });
    (importSPKI as unknown as MockInstance).mockRejectedValue(
      new Error("JOSE failure"),
    );

    await expect(handler({}, context)).rejects.toThrow("JOSE failure");
  });

  it("handles error in S3 upload", async () => {
    const fakePublicKey = new Uint8Array([1, 2, 3, 4]);
    const fakeCryptoKey = { fake: true } as unknown as CryptoKey;
    const fakeJwk = { kty: "RSA" };

    mockGetPublicKey.mockResolvedValueOnce({ PublicKey: fakePublicKey });
    mockDescribeKey.mockResolvedValueOnce({
      KeyMetadata: { KeyId: "test-key-id" },
    });
    (importSPKI as unknown as MockInstance).mockResolvedValue(fakeCryptoKey);
    (exportJWK as unknown as MockInstance).mockResolvedValue(fakeJwk);
    mockPutObject.mockRejectedValueOnce(new Error("S3 upload failed"));

    await expect(handler({}, context)).rejects.toThrow("S3 upload failed");
  });
});

describe("putContentToS3", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPutObject.mockReset();
    process.env["BUCKET_NAME"] = "test-bucket";
  });

  it("uploads successfully", async () => {
    const mockResponse = {
      ETag: "etag123",
      $metadata: { httpStatusCode: 200 },
    };

    mockPutObject.mockResolvedValueOnce(mockResponse);

    const response = await putContentToS3('{"data":"ok"}');

    expect(mockPutObject).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "jwks.json",
      Body: '{"data":"ok"}',
      ContentType: "application/json",
    });
    expect(response).toStrictEqual(mockResponse);
  });

  it("throws on S3 upload error", async () => {
    mockPutObject.mockRejectedValueOnce(new Error("S3 upload failed"));

    await expect(putContentToS3("{}")).rejects.toThrow("S3 upload failed");
  });

  it("throws if BUCKET_NAME is not set", async () => {
    delete process.env["BUCKET_NAME"];

    await expect(putContentToS3("{}")).rejects.toThrow("BUCKET_NAME not set");
  });
});
