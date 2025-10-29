import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockInstance } from "vitest";
import { handler, putContentToS3 } from "./jwks-creator.js";
import { GetPublicKeyCommand } from "@aws-sdk/client-kms";
import { type PutObjectCommandOutput } from "@aws-sdk/client-s3";
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

// @ts-expect-error
vi.mock(import("@aws-sdk/client-kms"), () => {
  const mockSend = vi.fn();
  return {
    KMSClient: vi.fn(() => ({ send: mockSend })),
    GetPublicKeyCommand: vi.fn(),
    DescribeKeyCommand: vi.fn(),
    __mockSend: mockSend,
  };
});

// @ts-expect-error
vi.mock(import("@aws-sdk/client-s3"), () => {
  const mockSend = vi.fn();
  return {
    S3Client: vi.fn(() => ({ send: mockSend })),
    PutObjectCommand: vi.fn(),
    __mockSend: mockSend,
  };
});

vi.mock(import("../../../commons/utils/awsClient/index.js"), () => ({
  getS3Client: vi.fn(),
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

const { __mockSend: mockKmsSend } = (await import(
  "@aws-sdk/client-kms"
)) as unknown as {
  __mockSend: MockInstance;
};

const { getS3Client } = (await import(
  "../../../commons/utils/awsClient/index.js"
)) as unknown as {
  getS3Client: MockInstance;
};

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
    process.env["AWS_REGION"] = "us-east-1";
    process.env["BUCKET_NAME"] = "test-bucket";
    process.env["STACK_NAME"] = "components-core";
    process.env["ALGORITHM"] = "RSA-OAEP-256";
  });

  it("successfully generates JWKS and uploads to S3", async () => {
    const fakePublicKey = new Uint8Array([1, 2, 3, 4]);
    const fakeCryptoKey = { fake: true } as unknown as CryptoKey;
    const fakeJwk = { kty: "RSA" };

    mockKmsSend
      .mockResolvedValueOnce({ PublicKey: fakePublicKey })
      .mockResolvedValueOnce({ KeyMetadata: { KeyId: "test-key-id" } });
    (importSPKI as unknown as MockInstance).mockResolvedValue(fakeCryptoKey);
    (exportJWK as unknown as MockInstance).mockResolvedValue(fakeJwk);
    const mockPutObject = vi
      .fn()
      .mockResolvedValue({ $metadata: { httpStatusCode: 200 } });
    getS3Client.mockResolvedValue({ putObject: mockPutObject });

    await expect(handler({}, context)).resolves.not.toThrow();

    expect(GetPublicKeyCommand).toHaveBeenCalledWith({
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
    mockKmsSend.mockResolvedValueOnce({ PublicKey: undefined });

    await expect(handler({}, context)).rejects.toThrow(
      "Public key not found for KMS Key Alias: alias/components-core-JARRSAEncryptionKey",
    );
  });

  it("handles error in KMS send", async () => {
    mockKmsSend.mockRejectedValueOnce(new Error("KMS failure"));

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

    const mockPutObject = vi.fn().mockResolvedValue(mockResponse);
    getS3Client.mockResolvedValue({ putObject: mockPutObject });

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
    const mockPutObject = vi
      .fn()
      .mockRejectedValue(new Error("S3 upload failed"));
    getS3Client.mockResolvedValue({ putObject: mockPutObject });

    await expect(putContentToS3("bucket", "file.json", "{}")).rejects.toThrow(
      "S3 upload failed",
    );
  });
});
