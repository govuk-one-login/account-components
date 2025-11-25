import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getAuthRequest } from "./getAuthRequest.js";

const mockGet = vi.fn();
const getDynamoDbClientMock = vi.fn(() => ({ get: mockGet }));

vi.mock(
  import("../../../../../commons/utils/awsClient/dynamodbClient/index.js"),
);
const mockedDynamoDbClient = vi.mocked(
  await import(
    "../../../../../commons/utils/awsClient/dynamodbClient/index.js"
  ),
).getDynamoDbClient;

vi.mock(import("./errors.js"));

describe("getAuthRequest", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, AUTH_TABLE_NAME: "auth-table" };
    mockedDynamoDbClient.mockImplementation(
      getDynamoDbClientMock as any as typeof mockedDynamoDbClient,
    );
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("throws when AUTH_TABLE_NAME is not configured", async () => {
    delete process.env["AUTH_TABLE_NAME"];

    await expect(getAuthRequest("code-1")).rejects.toThrow(
      "AUTH_TABLE_NAME is not configured",
    );
  });

  it("returns the parsed auth request when data is valid", async () => {
    const item = {
      code: "valid-code",
      outcome_id: "outcome-123",
      client_id: "client-abc",
      sub: "user-xyz",
      redirect_uri: "https://example.com/callback",
      scope: "openid profile",
      expiry_time: 1_717_171_717,
    };
    mockGet.mockResolvedValueOnce({ Item: item });

    await expect(getAuthRequest("valid-code")).resolves.toStrictEqual(item);

    expect(mockGet).toHaveBeenCalledWith({
      TableName: "auth-table",
      Key: { code: "valid-code" },
    });
  });
});
