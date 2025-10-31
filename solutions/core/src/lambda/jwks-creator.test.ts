import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockInstance } from "vitest";
import { handler, putContentToS3 } from "./jwks-creator.js";
import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandOutput,
} from "@aws-sdk/client-s3";
import type { CryptoKey } from "jose";
import { exportJWK, importSPKI } from "jose";
import type { Context } from "aws-lambda";

// @ts-expect-error
vi.mock(import("@aws-lambda-powertools/logger"), () => ({
  Logger: vi.fn().mockImplementation(function () {
    return {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      addContext: vi.fn(),
    };
  }),
}));

// @ts-expect-error
vi.mock(import("@aws-sdk/client-kms"), () => {
  const mockSend = vi.fn();
  return {
    KMSClient: vi.fn().mockImplementation(function () {
      return { send: mockSend };
    }),
    GetPublicKeyCommand: vi.fn(),
    DescribeKeyCommand: vi.fn(),
    __mockSend: mockSend,
  };
});

// @ts-expect-error
vi.mock(import("@aws-sdk/client-s3"), () => {
  const mockSend = vi.fn();
  return {
    S3Client: vi.fn().mockImplementation(function () {
      return { send: mockSend };
    }),
    PutObjectCommand: vi.fn(),
    __mockSend: mockSend,
  };
});

vi.mock(import("jose"), () => ({
  exportJWK: vi.fn(),
  importSPKI: vi.fn(),
}));

vi.mock(import("../../../commons/utils/awsClient/kmsClient/index.js"), () => ({
  createKmsClient: vi.fn(() => ({
    client: {} as any,
    config: {} as any,
    getPublicKey: vi.fn(),
    decrypt: vi.fn(),
    describeKey: vi.fn(),
  })),
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

const mockGetPublicKey = vi.fn();
const mockDescribeKey = vi.fn();

const { __mockSend: mockS3Send } = (await import(
  "@aws-sdk/client-s3"
)) as unknown as {
  __mockSend: MockInstance;
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
  beforeEach(async () => {
    vi.resetAllMocks();
    process.env["AWS_REGION"] = "us-east-1";
    process.env["BUCKET_NAME"] = "test-bucket";
    process.env["STACK_NAME"] = "components-core";
    process.env["ALGORITHM"] = "RSA-OAEP-256";

    // Reset the KMS client mock
    const kmsModule = await import(
      "../../../commons/utils/awsClient/kmsClient/index.js"
    );
    vi.mocked(kmsModule.createKmsClient).mockReturnValue({
      client: {} as any,
      config: {} as any,
      getPublicKey: mockGetPublicKey,
      decrypt: vi.fn(),
      describeKey: mockDescribeKey,
    });

    // Reset the S3 client mock
    const s3Module = await import("@aws-sdk/client-s3");
    vi.mocked(s3Module.S3Client).mockImplementation(function () {
      return { send: mockS3Send };
    });
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
    mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

    await expect(handler({}, context)).resolves.not.toThrow();

    expect(mockGetPublicKey).toHaveBeenCalledWith({
      KeyId: "alias/components-core-JARRSAEncryptionKey",
    });
    expect(mockDescribeKey).toHaveBeenCalledWith({
      KeyId: "alias/components-core-JARRSAEncryptionKey",
    });
    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "jwks.json",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Body: expect.stringContaining('"kty":"RSA"'),
      ContentType: "application/json",
    });
    expect(mockS3Send).toHaveBeenCalledTimes(1);
  });

  it("throws if public key is missing", async () => {
    mockGetPublicKey.mockResolvedValueOnce({ PublicKey: undefined });

    await expect(handler({}, context)).rejects.toThrow(
      "Public key not found for KMS Key Alias: alias/components-core-JARRSAEncryptionKey",
    );
  });

  it("handles error in KMS send", async () => {
    mockGetPublicKey.mockRejectedValueOnce(new Error("KMS failure"));

    await expect(handler({}, context)).rejects.toThrow("KMS failure");
  });
});

describe("putContentToS3", () => {
  beforeEach(async () => {
    vi.resetAllMocks();

    // Reset the S3 client mock
    const s3Module = await import("@aws-sdk/client-s3");
    vi.mocked(s3Module.S3Client).mockImplementation(function () {
      return { send: mockS3Send };
    });
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
    expect(response).toStrictEqual({
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
