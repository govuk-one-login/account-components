import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createAccessToken } from "./createAccessToken.js";
import { getKmsClient } from "../../../../../commons/utils/awsClient/kmsClient/index.js";
import { randomUUID } from "node:crypto";
import { derToJose } from "ecdsa-sig-formatter";
import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";

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

describe("createAccessToken", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    process.env = {
      ...ORIGINAL_ENV,
      JOURNEY_OUTCOME_ENDPOINT_URL: "https://example.com/journey-outcome",
      TOKEN_ENDPOINT_URL: "https://example.com/token",
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
    } as any as ReturnType<typeof getDynamoDbClient>);

    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.useRealTimers();
  });

  describe.each([
    "TOKEN_ENDPOINT_URL",
    "JOURNEY_OUTCOME_ENDPOINT_URL",
    "JWT_SIGNING_KEY_ALIAS",
    "AUTH_TABLE_NAME",
  ])("when %s is not configured", (envVar) => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env[envVar];
    });

    it(`throws when ${envVar} is not configured`, async () => {
      await expect(
        createAccessToken({
          outcome_id: "outcome-123",
          client_id: "client-abc",
          redirect_uri: "https://example.com/callback",
          code: "code-1",
          sub: "user-xyz",
          expires: Date.now() / 1000 + 600,
        }),
      ).rejects.toThrow(`${envVar} is not configured`);
    });
  });

  it("returns the parsed auth request when data is valid", async () => {
    const accessToken = await createAccessToken({
      outcome_id: "outcome-123",
      client_id: "client-abc",
      redirect_uri: "https://example.com/callback",
      code: "code-1",
      sub: "user-xyz",
      expires: Date.now() / 1000 + 600,
    });

    expect(accessToken).toBe(
      "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5LWlkIn0.eyJvdXRjb21lX2lkIjoib3V0Y29tZS0xMjMiLCJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tL3Rva2VuIiwic3ViIjoidXNlci14eXoiLCJhdWQiOiJodHRwczovL2V4YW1wbGUuY29tL2pvdXJuZXktb3V0Y29tZSIsImlhdCI6MTcwNDA2NzIwMCwiZXhwIjoxNzA0MDY3MjYwLCJqdGkiOiJ1bmlxdWUtanRpLXZhbHVlLW1vY2stcmVzcG9uc2UifQ.jose-format-signature-of-mock-signature", // pragma: allowlist secret
    );
  });
});
