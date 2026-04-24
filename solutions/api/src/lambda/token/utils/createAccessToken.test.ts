import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createAccessToken } from "./createAccessToken.js";
import { getKmsClient } from "../../../../../commons/utils/awsClient/kmsClient/index.js";
import { randomUUID } from "node:crypto";
import { derToJose } from "ecdsa-sig-formatter";
import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { logger } from "../../../../../commons/utils/logger/index.js";

vi.mock(import("ecdsa-sig-formatter"));
const mockDerToJose = vi.mocked(derToJose);

vi.mock(import("../../../../../commons/utils/awsClient/kmsClient/index.js"));
const mockGetKmsClient = vi.mocked(getKmsClient);

vi.mock(import("node:crypto"));
const mockRandomUUID = vi.mocked(randomUUID);

vi.mock(
  import("../../../../../commons/utils/awsClient/dynamodbClient/index.js"),
);
const mockGetDynamoDbClient = vi.mocked(getDynamoDbClient);

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/logger/index.js"), () => ({
  logger: { error: vi.fn() },
}));
const mockLoggerError = vi.mocked(logger.error);

describe("createAccessToken", () => {
  const ORIGINAL_ENV = process.env;
  const mockApiBaseUrl = "https://example.com";

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.resetModules();

    process.env = {
      ...ORIGINAL_ENV,
      JWT_SIGNING_KEY_ALIAS: "test-key-alias",
      AUTH_TABLE_NAME: "auth-table",
    };

    mockGetKmsClient.mockReturnValue({
      describeKey: vi.fn().mockResolvedValue({
        KeyMetadata: { KeyId: "test-key-id" },
      }),
      sign: vi.fn().mockResolvedValue({ Signature: "mock-signature" }),
    } as any as ReturnType<typeof getKmsClient>);

    mockRandomUUID.mockReturnValue("unique-jti-value-mock-response");

    mockDerToJose.mockImplementation((signature: string | Buffer) => {
      return `jose-format-signature-of-${signature.toString()}`;
    });

    mockGetDynamoDbClient.mockReturnValue({
      get: vi.fn().mockResolvedValue({
        Item: {
          sub: "user-xyz",
        },
      }),
      delete: vi.fn().mockResolvedValue({}),
    } as any as ReturnType<typeof getDynamoDbClient>);

    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.useRealTimers();
  });

  describe.each(["JWT_SIGNING_KEY_ALIAS", "AUTH_TABLE_NAME"])(
    "when %s is not configured",
    (envVar) => {
      beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete process.env[envVar];
      });

      it(`throws when ${envVar} is not configured`, async () => {
        await expect(
          createAccessToken(
            {
              outcome_id: "outcome-123",
              client_id: "client-abc",
              redirect_uri: "https://example.com/callback",
              code: "code-1",
              sub: "user-xyz",
              expires: Date.now() / 1000 + 600,
            },
            mockApiBaseUrl,
          ),
        ).rejects.toThrow(`${envVar} is not configured`);
      });
    },
  );

  it("returns the parsed auth request when data is valid", async () => {
    const accessToken = await createAccessToken(
      {
        outcome_id: "outcome-123",
        client_id: "client-abc",
        redirect_uri: "https://example.com/callback",
        code: "code-1",
        sub: "user-xyz",
        expires: Date.now() / 1000 + 600,
      },
      mockApiBaseUrl,
    );

    expect(accessToken).toBe(
      "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5LWlkIn0.eyJvdXRjb21lX2lkIjoib3V0Y29tZS0xMjMiLCJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tL3Rva2VuIiwic3ViIjoidXNlci14eXoiLCJhdWQiOiJodHRwczovL2V4YW1wbGUuY29tL2pvdXJuZXlvdXRjb21lIiwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjE3MDQwNjc1MDAsImp0aSI6InVuaXF1ZS1qdGktdmFsdWUtbW9jay1yZXNwb25zZSJ9.jose-format-signature-of-mock-signature", // pragma: allowlist secret
    );
  });

  it("deletes the auth code from DynamoDB after creating the token", async () => {
    await createAccessToken(
      {
        outcome_id: "outcome-123",
        client_id: "client-abc",
        redirect_uri: "https://example.com/callback",
        code: "code-1",
        sub: "user-xyz",
        expires: Date.now() / 1000 + 600,
      },
      mockApiBaseUrl,
    );

    expect(mockGetDynamoDbClient().delete).toHaveBeenCalledWith({
      TableName: "auth-table",
      Key: { code: "code-1" },
    });
  });

  it("logs an error and still returns the token when deleting the auth code fails", async () => {
    const deleteError = new Error("DynamoDB delete failed");
    mockGetDynamoDbClient.mockReturnValue({
      get: vi.fn().mockResolvedValue({
        Item: { sub: "user-xyz" },
      }),
      delete: vi.fn().mockRejectedValue(deleteError),
    } as any as ReturnType<typeof getDynamoDbClient>);

    const accessToken = await createAccessToken(
      {
        outcome_id: "outcome-123",
        client_id: "client-abc",
        redirect_uri: "https://example.com/callback",
        code: "code-1",
        sub: "user-xyz",
        expires: Date.now() / 1000 + 600,
      },
      mockApiBaseUrl,
    );

    expect(mockLoggerError).toHaveBeenCalledWith(
      "Error deleting from auth codes table ",
      { error: deleteError },
    );
    expect(accessToken).toBe(
      "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5LWlkIn0.eyJvdXRjb21lX2lkIjoib3V0Y29tZS0xMjMiLCJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tL3Rva2VuIiwic3ViIjoidXNlci14eXoiLCJhdWQiOiJodHRwczovL2V4YW1wbGUuY29tL2pvdXJuZXlvdXRjb21lIiwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjE3MDQwNjc1MDAsImp0aSI6InVuaXF1ZS1qdGktdmFsdWUtbW9jay1yZXNwb25zZSJ9.jose-format-signature-of-mock-signature", // pragma: allowlist secret
    );
  });
});
