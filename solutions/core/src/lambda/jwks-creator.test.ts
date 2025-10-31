import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockInstance } from "vitest";
import { handler, putContentToS3 } from "./jwks-creator.js";
import type { PutObjectCommandOutput } from "@aws-sdk/client-s3";
import type { CryptoKey } from "jose";
import { exportJWK, importSPKI } from "jose";
import type { Context } from "aws-lambda";

// @ts-expect-error
vi.mock(import("@aws-lambda-powertools/logger"), () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    addContext: vi.fn(),
  })),
}));

const mockGetPublicKey = vi.fn();
const mockDescribeKey = vi.fn();
const mockPutObject = vi.fn();

// @ts-expect-error
vi.mock(import("../../../commons/utils/awsClients/kmsClient/index.js"), () => ({
  getKmsClient: vi.fn(() => ({
    getPublicKey: mockGetPublicKey,
    describeKey: mockDescribeKey,
  })),
}));

// @ts-expect-error
vi.mock(import("../../../commons/utils/awsClients/s3Client/index.js"), () => ({
  getS3Client: vi.fn(() => ({
    putObject: mockPutObject,
  })),
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
  awsRequestId: "",
  callbackWaitsForEmptyEventLoop: false,
  functionName: "",
  functionVersion: "",
  invokedFunctionArn: "",
  logGroupName: "",
  logStreamName: "",
  memoryLimitInMB: "",
  done: vi.fn(),
  fail: vi.fn(),
  getRemainingTimeInMillis: vi.fn(),
  succeed: vi.fn(),
};

describe("handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env["BUCKET_NAME"] = "test-bucket";
    process.env["STACK_NAME"] = "components-core";
    process.env["ALGORITHM"] = "RSA-OAEP-256";
  });

  it("successfully generates JWKS and uploads to S3", async () => {
    const fakePublicKey = new Uint8Array([1, 2, 3, 4]);
    const fakeCryptoKey = { fake: true } as unknown as CryptoKey;
    const fakeJwk = { kty: "RSA" };

    mockGetPublicKey.mockResolvedValue({ PublicKey: fakePublicKey });
    mockDescribeKey.mockResolvedValue({
      KeyMetadata: { KeyId: "test-key-id" },
    });
    (importSPKI as unknown as MockInstance).mockResolvedValue(fakeCryptoKey);
    (exportJWK as unknown as MockInstance).mockResolvedValue(fakeJwk);
    mockPutObject.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });

    await expect(handler({}, context)).resolves.not.toThrow();

    expect(mockGetPublicKey).toHaveBeenCalledWith({
      KeyId: "alias/components-core-JARRSAEncryptionKey",
    });
    expect(mockPutObject).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "jwks.json",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Body: expect.stringContaining('"kty":"RSA"'),
      ContentType: "application/json",
    });
  });

  it("throws if public key is missing", async () => {
    mockGetPublicKey.mockResolvedValue({ PublicKey: undefined });

    await expect(handler({}, context)).rejects.toThrow(
      "Public key not found for KMS Key Alias: alias/components-core-JARRSAEncryptionKey",
    );
  });

  it("handles error in KMS send", async () => {
    mockGetPublicKey.mockRejectedValue(new Error("KMS failure"));

    await expect(handler({}, context)).rejects.toThrow("KMS failure");
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

    mockPutObject.mockResolvedValue(mockResponse);

    const response = await putContentToS3(
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
    expect(response).toStrictEqual({
      ETag: "etag123",
      $metadata: { httpStatusCode: 200 },
    });
  });

  it("throws on S3 upload error", async () => {
    mockPutObject.mockRejectedValue(new Error("S3 upload failed"));

    await expect(putContentToS3("bucket", "file.json", "{}")).rejects.toThrow(
      "S3 upload failed",
    );
  });
});
